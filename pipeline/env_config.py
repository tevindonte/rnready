import os
from pathlib import Path

from dotenv import load_dotenv

PIPELINE_DIR = Path(__file__).parent
load_dotenv(PIPELINE_DIR / ".env")


def require_env(*names: str) -> dict[str, str]:
    """Return required env vars or exit with a clear message."""
    missing = [n for n in names if not os.environ.get(n, "").strip()]
    if missing:
        lines = [
            "Missing required environment variables in pipeline/.env:",
            *[f"  - {n}" for n in missing],
            "",
            "Edit: pipeline/.env",
        ]
        if "SUPABASE_SERVICE_KEY" in missing:
            lines.extend(
                [
                    "",
                    "SUPABASE_SERVICE_KEY = service_role key (not the anon/publishable key)",
                    "Supabase Dashboard → Project Settings → API → service_role → Reveal",
                ]
            )
        raise SystemExit("\n".join(lines))
    return {n: os.environ[n].strip() for n in names}
