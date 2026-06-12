import logging
import os
from pathlib import Path

from openai import OpenAI

import env_config  # noqa: F401
from db import get_supabase, warn_if_legacy_schema
from env_config import require_env
from process import process_parsed_items, process_text
from source_registry import archive_source, load_sources
from sources.pdf import fetch_pdf_qa_pair_text, fetch_pdf_text
from sources.quizlet import parse_quizlet_export
from sources.transcript import fetch_transcript_file
from sources.web import fetch_web_text
from sources.youtube import fetch_youtube_transcript

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

PIPELINE_DIR = Path(__file__).parent
REPO_ROOT = PIPELINE_DIR.parent


def resolve_path(value: str) -> Path:
    path = Path(value)
    if path.is_absolute():
        return path
    candidate = PIPELINE_DIR / value
    if candidate.exists():
        return candidate
    return REPO_ROOT / value


def fetch_source(source: dict) -> str | list[dict]:
    source_type = source["type"]
    if source_type == "youtube":
        return fetch_youtube_transcript(source["value"])
    if source_type == "pdf":
        path = resolve_path(source["value"])
        return fetch_pdf_text(
            str(path),
            page_start=source.get("page_start"),
            page_end=source.get("page_end"),
        )
    if source_type == "pdf_qa_pair":
        q_path = resolve_path(source["questions"])
        a_path = resolve_path(source["answers"])
        return fetch_pdf_qa_pair_text(
            str(q_path),
            str(a_path),
            page_start=source.get("page_start"),
            page_end=source.get("page_end"),
        )
    if source_type == "text":
        return fetch_transcript_file(str(resolve_path(source["value"])))
    if source_type == "quizlet":
        return parse_quizlet_export(str(resolve_path(source["value"])))
    if source_type == "web":
        return fetch_web_text(source["value"])
    raise ValueError(f"Unknown source type: {source_type}")


def process_source(client: OpenAI, db, source: dict) -> tuple[int, int, bool, dict[str, int]]:
    source_id = source["id"]
    label = source.get("label", source_id)
    logger.info("Processing source: %s", label)

    try:
        payload = fetch_source(source)
    except Exception as exc:
        logger.error("Failed to fetch %s: %s", source_id, exc)
        return 0, 1, False, {}

    if source["type"] == "quizlet":
        if not isinstance(payload, list) or not payload:
            logger.warning("No parsed Quizlet cards for %s", source_id)
            return 0, 1, False, {}
        logger.info("  Parsed %d Quizlet cards", len(payload))
        inserted, failed, stats = process_parsed_items(client, db, payload, source_id)
        return inserted, failed, True, stats

    if not isinstance(payload, str) or not payload.strip():
        logger.warning("Empty text for %s", source_id)
        return 0, 1, False, {}

    inserted, failed, stats = process_text(
        client,
        db,
        payload,
        source_id,
        chunk_size_words=source.get("chunk_size_words", 4000),
        chunk_overlap_words=source.get("chunk_overlap_words", 200),
        source_format=source.get("source_format"),
    )
    return inserted, failed, True, stats


def main() -> None:
    require_env("OPENAI_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_KEY")
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    db = get_supabase()
    warn_if_legacy_schema(db)

    sources = load_sources()
    total_inserted = 0
    total_failed = 0
    archived = 0

    for source in sources:
        if source.get("enabled", True) is False:
            logger.info("Skipping disabled source: %s", source.get("id"))
            continue
        inserted, failed, fetch_ok, stats = process_source(client, db, source)
        total_inserted += inserted
        total_failed += failed
        logger.info("Source %s: %d inserted, %d failed", source["id"], inserted, failed)
        if stats:
            logger.info(
                "  Explanation paths: reformat=%d generate=%d | sata=%d | no_source_rationale=%d",
                stats.get("reformat", 0),
                stats.get("generate", 0),
                stats.get("sata", 0),
                stats.get("missing_rationale", 0),
            )

        skip_archive = source.get("skip_archive", False)
        if fetch_ok and inserted > 0 and not skip_archive:
            archive_source(source, inserted=inserted, failed=failed)
            archived += 1
            logger.info("Archived %s → sources_archive.json", source["id"])
        elif fetch_ok and inserted > 0 and skip_archive:
            logger.info("Skipping archive for %s (skip_archive=true — gate/test run)", source["id"])
        elif fetch_ok and inserted == 0:
            logger.warning("Source %s fetched OK but 0 questions inserted — left in sources.json", source["id"])

    logger.info("Done. Inserted: %d, failed: %d, archived: %d", total_inserted, total_failed, archived)


if __name__ == "__main__":
    main()
