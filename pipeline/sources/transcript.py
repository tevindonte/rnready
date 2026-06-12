"""Clean exported YouTube transcript text files."""

from __future__ import annotations

import re
from pathlib import Path


def clean_transcript_text(text: str) -> str:
    lines: list[str] = []
    for line in text.replace("\r", "").split("\n"):
        s = line.strip()
        if not s or s in {"e", "e e"}:
            continue
        if re.fullmatch(r"\d+:\d{2}", s):
            continue
        if re.fullmatch(r"\d+", s):
            continue
        lines.append(s)
    return "\n".join(lines)


def fetch_transcript_file(path: str) -> str:
    raw = Path(path).read_text(encoding="utf-8", errors="replace")
    return clean_transcript_text(raw)
