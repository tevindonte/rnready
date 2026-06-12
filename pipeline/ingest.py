import logging
import os
from pathlib import Path

from openai import OpenAI

import env_config  # noqa: F401
from db import get_supabase, warn_if_legacy_schema
from env_config import require_env
from process import process_text
from source_registry import archive_source, load_sources
from sources.pdf import fetch_pdf_text
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


def fetch_source(source: dict) -> str:
    source_type = source["type"]
    value = source["value"]
    if source_type == "youtube":
        return fetch_youtube_transcript(value)
    if source_type == "pdf":
        path = resolve_path(value)
        return fetch_pdf_text(
            str(path),
            page_start=source.get("page_start"),
            page_end=source.get("page_end"),
        )
    if source_type == "web":
        return fetch_web_text(value)
    raise ValueError(f"Unknown source type: {source_type}")


def process_source(client: OpenAI, db, source: dict) -> tuple[int, int, bool]:
    source_id = source["id"]
    label = source.get("label", source_id)
    logger.info("Processing source: %s", label)

    try:
        raw_text = fetch_source(source)
    except Exception as exc:
        logger.error("Failed to fetch %s: %s", source_id, exc)
        return 0, 1, False

    if not raw_text.strip():
        logger.warning("Empty text for %s", source_id)
        return 0, 1, False

    inserted, failed = process_text(client, db, raw_text, source_id)
    return inserted, failed, True


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
        inserted, failed, fetch_ok = process_source(client, db, source)
        total_inserted += inserted
        total_failed += failed
        logger.info("Source %s: %d inserted, %d failed", source["id"], inserted, failed)

        if fetch_ok and inserted > 0:
            archive_source(source, inserted=inserted, failed=failed)
            archived += 1
            logger.info("Archived %s → sources_archive.json", source["id"])
        elif fetch_ok and inserted == 0:
            logger.warning("Source %s fetched OK but 0 questions inserted — left in sources.json", source["id"])

    logger.info("Done. Inserted: %d, failed: %d, archived: %d", total_inserted, total_failed, archived)


if __name__ == "__main__":
    main()
