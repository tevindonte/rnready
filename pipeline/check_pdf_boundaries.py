"""Sample PDF pages near ingestion boundaries to verify question start/end."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pdfplumber

PIPELINE_DIR = Path(__file__).parent
REPO_ROOT = PIPELINE_DIR.parent


def resolve_path(value: str) -> Path:
    path = Path(value)
    if path.is_absolute():
        return path
    for base in (PIPELINE_DIR, REPO_ROOT):
        candidate = base / value
        if candidate.exists():
            return candidate
    return REPO_ROOT / value


def safe_print(text: str) -> None:
    try:
        print(text)
    except UnicodeEncodeError:
        print(text.encode("ascii", errors="replace").decode("ascii"))


def preview_page(pdf: pdfplumber.PDF, page_num: int, lines: int = 8) -> None:
    if page_num < 1 or page_num > len(pdf.pages):
        safe_print(f"  Page {page_num}: OUT OF RANGE (PDF has {len(pdf.pages)} pages)")
        return
    text = pdf.pages[page_num - 1].extract_text() or ""
    rows = [ln.strip() for ln in text.splitlines() if ln.strip()]
    safe_print(f"\n--- Page {page_num} ({len(rows)} non-empty lines) ---")
    if not rows:
        safe_print("  (empty)")
        return
    for ln in rows[:lines]:
        safe_print(f"  {ln[:120]}")
    if len(rows) > lines:
        safe_print(f"  ... ({len(rows) - lines} more lines)")
    safe_print("  [last lines]")
    for ln in rows[-min(3, len(rows)) :]:
        safe_print(f"  {ln[:120]}")


def scan_for_markers(pdf: pdfplumber.PDF, start: int, end: int) -> None:
    markers = (
        "Answer:",
        "Rationale:",
        "Client Needs:",
        "Content Area:",
        "Category:",
        "Select all that apply",
        "The Answer is",
    )
    hits: dict[str, list[int]] = {m: [] for m in markers}
    for page_num in range(start, min(end, len(pdf.pages)) + 1):
        text = (pdf.pages[page_num - 1].extract_text() or "").lower()
        for marker in markers:
            if marker.lower() in text:
                hits[marker].append(page_num)
    safe_print("\nMarker scan (first 5 hits each):")
    for marker, pages in hits.items():
        sample = pages[:5]
        safe_print(f"  {marker}: {sample}{' ...' if len(pages) > 5 else ''} ({len(pages)} total)")


def main() -> None:
    parser = argparse.ArgumentParser(description="Preview PDF boundary pages for ingestion")
    parser.add_argument("pdf", help="Path to PDF (relative to repo or pipeline)")
    parser.add_argument(
        "--pages",
        nargs="+",
        type=int,
        default=[95, 100, 105, 1690, 1700, 1710],
        help="Page numbers to preview",
    )
    parser.add_argument("--scan-start", type=int, help="Start page for marker scan")
    parser.add_argument("--scan-end", type=int, help="End page for marker scan")
    args = parser.parse_args()

    path = resolve_path(args.pdf)
    if not path.exists():
        print(f"File not found: {path}", file=sys.stderr)
        sys.exit(1)

    safe_print(f"PDF: {path}")
    with pdfplumber.open(path) as pdf:
        safe_print(f"Total pages: {len(pdf.pages)}")
        for page_num in args.pages:
            preview_page(pdf, page_num)
        if args.scan_start and args.scan_end:
            scan_for_markers(pdf, args.scan_start, args.scan_end)


if __name__ == "__main__":
    main()
