"""Post-ingestion validation — run after Saunders/Kaplan full ingest completes."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

PIPELINE_DIR = Path(__file__).parent


def run(cmd: list[str]) -> int:
    print(f"\n>>> {' '.join(cmd)}\n")
    return subprocess.call(cmd, cwd=PIPELINE_DIR)


def main() -> None:
    source = sys.argv[1] if len(sys.argv) > 1 else "pdf:saunders_qa"
    steps = [
        [sys.executable, "spot_check_ingestion.py", "--full", "--source", source],
        [sys.executable, "qa_critic.py", "--source", source, "--fix-subcategories"],
        [sys.executable, "qa_critic.py", "--source", source, "--llm", "--fix-subcategories"],
        [sys.executable, "spot_check_ingestion.py", "--full", "--source", source],
    ]
    for cmd in steps:
        code = run(cmd)
        if code != 0:
            print(f"Step failed with exit code {code}")
            sys.exit(code)
    print("\nPost-ingest validation complete.")


if __name__ == "__main__":
    main()
