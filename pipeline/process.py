import hashlib
import logging
from openai import OpenAI

from db import upsert_question
from explain import get_or_generate_explanation
from extract import extract_questions, parse_question_item

logger = logging.getLogger(__name__)

CHUNK_WORDS = 4000
OVERLAP_WORDS = 200


def chunk_text(
    text: str,
    chunk_words: int = CHUNK_WORDS,
    overlap: int = OVERLAP_WORDS,
) -> list[str]:
    words = text.split()
    if len(words) <= chunk_words:
        return [text]
    chunks: list[str] = []
    start = 0
    while start < len(words):
        end = min(start + chunk_words, len(words))
        chunks.append(" ".join(words[start:end]))
        if end >= len(words):
            break
        start = end - overlap
    return chunks


def process_text(
    client: OpenAI,
    db,
    text: str,
    source_id: str,
    *,
    target_count: int | None = None,
    chunk_size_words: int = CHUNK_WORDS,
    chunk_overlap_words: int = OVERLAP_WORDS,
    source_format: str | None = None,
    is_custom: bool = False,
    custom_owner_id: str | None = None,
) -> tuple[int, int, dict[str, int]]:
    """Extract, explain, and upsert questions from raw text. Returns (inserted, failed, stats)."""
    inserted = 0
    failed = 0
    stats = {"reformat": 0, "generate": 0, "sata": 0, "missing_rationale": 0}
    seen_hashes: set[str] = set()

    chunks = chunk_text(text, chunk_size_words, chunk_overlap_words)
    total_chunks = len(chunks)
    logger.info("  %d words → %d chunks (size=%d, overlap=%d)", len(text.split()), total_chunks, chunk_size_words, chunk_overlap_words)

    for i, chunk in enumerate(chunks):
        chunk_num = i + 1
        logger.info("  Chunk %d/%d", chunk_num, total_chunks)
        try:
            per_chunk_target = None
            if target_count and source_format != "exam_book":
                per_chunk_target = max(1, target_count // len(chunks))
            questions = extract_questions(
                client,
                chunk,
                target_count=per_chunk_target,
                source_format=source_format,
            )
        except Exception as exc:
            logger.error("  Extraction failed: %s", exc)
            failed += 1
            continue

        for q in questions:
            q_hash = hashlib.md5(q.question.encode()).hexdigest()
            if q_hash in seen_hashes:
                continue
            seen_hashes.add(q_hash)

            try:
                explanation, explain_method = get_or_generate_explanation(client, q)
                stats[explain_method] += 1
                if q.is_ngn and q.ngn_type == "sata":
                    stats["sata"] += 1
                if not (q.source_verbatim or "").strip():
                    stats["missing_rationale"] += 1

                upsert_question(
                    db,
                    q,
                    source_id,
                    explanation,
                    is_custom=is_custom,
                    custom_owner_id=custom_owner_id,
                )
                inserted += 1
                logger.info(
                    "  [%s|%s] %s | cat=%s sub=%s ans=%s",
                    q.content_origin,
                    explain_method,
                    q.question[:50],
                    q.category,
                    q.subcategory or "?",
                    q.correct_answer,
                )
            except Exception as exc:
                logger.error("  Failed to insert: %s", exc)
                failed += 1

        logger.info(
            "[CHECKPOINT chunk %d/%d] inserted=%d reformat=%d generate=%d sata=%d failed=%d",
            chunk_num,
            total_chunks,
            inserted,
            stats["reformat"],
            stats["generate"],
            stats["sata"],
            failed,
        )

    logger.info(
        "  Stats: reformat=%d generate=%d sata=%d missing_source_rationale=%d",
        stats["reformat"],
        stats["generate"],
        stats["sata"],
        stats["missing_rationale"],
    )
    return inserted, failed, stats


def process_parsed_items(
    client: OpenAI,
    db,
    items: list[dict],
    source_id: str,
    *,
    is_custom: bool = False,
    custom_owner_id: str | None = None,
) -> tuple[int, int, dict[str, int]]:
    """Upsert pre-parsed question dicts (e.g. Quizlet export). Returns (inserted, failed, stats)."""
    inserted = 0
    failed = 0
    stats = {"reformat": 0, "generate": 0, "sata": 0, "missing_rationale": 0}
    seen_hashes: set[str] = set()
    total = len(items)

    for i, raw in enumerate(items, start=1):
        q = parse_question_item(raw)
        if not q:
            failed += 1
            continue

        q_hash = hashlib.md5(q.question.encode()).hexdigest()
        if q_hash in seen_hashes:
            continue
        seen_hashes.add(q_hash)

        try:
            explanation, explain_method = get_or_generate_explanation(client, q)
            stats[explain_method] += 1
            if q.is_ngn and q.ngn_type == "sata":
                stats["sata"] += 1
            if not (q.source_verbatim or "").strip():
                stats["missing_rationale"] += 1

            upsert_question(
                db,
                q,
                source_id,
                explanation,
                is_custom=is_custom,
                custom_owner_id=custom_owner_id,
            )
            inserted += 1
            if i == 1 or i % 25 == 0 or i == total:
                logger.info(
                    "[CHECKPOINT parsed %d/%d] inserted=%d reformat=%d generate=%d failed=%d",
                    i,
                    total,
                    inserted,
                    stats["reformat"],
                    stats["generate"],
                    failed,
                )
        except Exception as exc:
            logger.error("  Failed to insert: %s", exc)
            failed += 1

    return inserted, failed, stats
