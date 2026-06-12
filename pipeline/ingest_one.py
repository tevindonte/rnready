"""Ingest a single source by id from sources.json (for partial runs)."""
import argparse
import logging
import os

from openai import OpenAI

import env_config  # noqa: F401
from db import get_supabase, warn_if_legacy_schema
from env_config import require_env
from ingest import process_source
from source_registry import archive_source, load_sources

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source_id", help="e.g. quizlet:nclex_export_001")
    args = parser.parse_args()

    require_env("OPENAI_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_KEY")
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    db = get_supabase()
    warn_if_legacy_schema(db)

    source = next((s for s in load_sources() if s.get("id") == args.source_id), None)
    if not source:
        raise SystemExit(f"Source not found: {args.source_id}")

    inserted, failed, fetch_ok, stats = process_source(client, db, source)
    logger.info("Source %s: %d inserted, %d failed", args.source_id, inserted, failed)
    if stats:
        logger.info(
            "  Explanation paths: reformat=%d generate=%d | sata=%d",
            stats.get("reformat", 0),
            stats.get("generate", 0),
            stats.get("sata", 0),
        )
    if fetch_ok and inserted > 0 and not source.get("skip_archive"):
        archive_source(source, inserted=inserted, failed=failed)
        logger.info("Archived %s", args.source_id)


if __name__ == "__main__":
    main()
