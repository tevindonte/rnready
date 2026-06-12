import hashlib
import logging
from openai import OpenAI

from db import upsert_question
from explain import generate_explanation
from extract import extract_questions

logger = logging.getLogger(__name__)

CHUNK_WORDS = 4000
OVERLAP_WORDS = 200


def chunk_text(text: str, chunk_words: int = CHUNK_WORDS, overlap: int = OVERLAP_WORDS) -> list[str]:
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
    is_custom: bool = False,
    custom_owner_id: str | None = None,
) -> tuple[int, int]:
    """Extract, explain, and upsert questions from raw text. Returns (inserted, failed)."""
    inserted = 0
    failed = 0
    seen_hashes: set[str] = set()

    chunks = chunk_text(text)
    for i, chunk in enumerate(chunks):
        logger.info("  Chunk %d/%d", i + 1, len(chunks))
        try:
            per_chunk_target = None
            if target_count:
                per_chunk_target = max(1, target_count // len(chunks))
            questions = extract_questions(client, chunk, target_count=per_chunk_target)
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
                explanation = generate_explanation(client, q)
                upsert_question(
                    db,
                    q,
                    source_id,
                    explanation,
                    is_custom=is_custom,
                    custom_owner_id=custom_owner_id,
                )
                inserted += 1
                logger.info("  [%s] %s...", q.content_origin, q.question[:60])
            except Exception as exc:
                logger.error("  Failed to insert: %s", exc)
                failed += 1

    return inserted, failed
