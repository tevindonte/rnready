import json
from datetime import datetime, timezone
from pathlib import Path

PIPELINE_DIR = Path(__file__).parent
SOURCES_PATH = PIPELINE_DIR / "sources.json"
ARCHIVE_PATH = PIPELINE_DIR / "sources_archive.json"


def load_sources() -> list[dict]:
    with open(SOURCES_PATH, encoding="utf-8") as f:
        return json.load(f)


def save_sources(sources: list[dict]) -> None:
    with open(SOURCES_PATH, "w", encoding="utf-8") as f:
        json.dump(sources, f, indent=2)
        f.write("\n")


def load_archive() -> list[dict]:
    if not ARCHIVE_PATH.exists():
        return []
    with open(ARCHIVE_PATH, encoding="utf-8") as f:
        return json.load(f)


def save_archive(archive: list[dict]) -> None:
    with open(ARCHIVE_PATH, "w", encoding="utf-8") as f:
        json.dump(archive, f, indent=2)
        f.write("\n")


def archive_source(source: dict, *, inserted: int, failed: int) -> None:
    """Move a processed source from sources.json into sources_archive.json."""
    entry = {
        **source,
        "processed_at": datetime.now(timezone.utc).isoformat(),
        "stats": {"inserted": inserted, "failed": failed},
    }
    entry.pop("enabled", None)

    active = load_sources()
    archive = load_archive()

    save_sources([s for s in active if s.get("id") != source.get("id")])
    save_archive([entry, *archive])
