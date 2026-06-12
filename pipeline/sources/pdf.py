"""PDF text extraction with OCR fallback for image-only PDFs."""

from __future__ import annotations

import hashlib
import logging
from pathlib import Path

import pdfplumber

logger = logging.getLogger(__name__)

PIPELINE_DIR = Path(__file__).resolve().parent.parent
OCR_CACHE_DIR = PIPELINE_DIR / ".ocr_cache"

_reader = None


def _is_low_quality_extract(text_blocks: list[str]) -> bool:
    """True when pdfplumber text is empty, tiny, or watermark-only (needs OCR)."""
    if not text_blocks:
        return True
    total_words = sum(len(b.split()) for b in text_blocks)
    if total_words < 100:
        return True
    normalized = [b.strip().lower()[:100] for b in text_blocks if b.strip()]
    if not normalized:
        return True
    from collections import Counter

    top_count = Counter(normalized).most_common(1)[0][1]
    if top_count / len(normalized) > 0.5 and total_words < len(text_blocks) * 20:
        return True
    return False


def _get_ocr_reader():
    global _reader
    if _reader is None:
        import easyocr

        logger.info("Initializing EasyOCR (first run downloads models)...")
        _reader = easyocr.Reader(["en"], gpu=False, verbose=False)
    return _reader


def _ocr_page_pixmap(page) -> str:
    import cv2
    import fitz
    import numpy as np

    if isinstance(page, fitz.Page):
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
        if pix.n == 4:
            img = cv2.cvtColor(img, cv2.COLOR_RGBA2RGB)
    else:
        img = page.to_image(resolution=200).original
        img = np.array(img.convert("RGB"))
        img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)

    reader = _get_ocr_reader()
    parts = reader.readtext(img, detail=0, paragraph=True)
    return "\n".join(p.strip() for p in parts if p.strip())


def _cache_path(path: str, page_start: int | None, page_end: int | None) -> Path:
    key = f"{Path(path).resolve()}|{page_start}|{page_end}"
    digest = hashlib.md5(key.encode()).hexdigest()
    OCR_CACHE_DIR.mkdir(exist_ok=True)
    return OCR_CACHE_DIR / f"{digest}.txt"


def _ocr_pdf_pages(path: str, page_start: int | None, page_end: int | None) -> str:
    cache = _cache_path(path, page_start, page_end)
    if cache.exists():
        logger.info("Using OCR cache: %s", cache.name)
        return cache.read_text(encoding="utf-8")

    import fitz

    text_blocks: list[str] = []
    with fitz.open(path) as doc:
        start = (page_start - 1) if page_start else 0
        end = page_end if page_end else len(doc)
        pages = range(start, min(end, len(doc)))
        total = len(pages)
        for i, page_idx in enumerate(pages, start=1):
            if i == 1 or i % 10 == 0 or i == total:
                logger.info("  OCR page %d/%d (%s)", i, total, Path(path).name)
            text = _ocr_page_pixmap(doc[page_idx])
            if text.strip():
                text_blocks.append(text)

    combined = "\n\n".join(text_blocks)
    cache.write_text(combined, encoding="utf-8")
    return combined


def fetch_pdf_text(
    path: str,
    page_start: int | None = None,
    page_end: int | None = None,
    *,
    ocr_if_empty: bool = True,
) -> str:
    text_blocks: list[str] = []
    with pdfplumber.open(path) as pdf:
        pages = pdf.pages
        if page_start is not None:
            end = page_end if page_end is not None else len(pages)
            pages = pages[page_start - 1 : end]
        for page in pages:
            text = page.extract_text()
            if text:
                text_blocks.append(text)

    combined = "\n\n".join(text_blocks)
    if combined.strip() and not _is_low_quality_extract(text_blocks):
        return combined

    if not ocr_if_empty:
        return combined

    logger.warning("Low-quality text layer in %s — running OCR", Path(path).name)
    return _ocr_pdf_pages(path, page_start, page_end)


def fetch_pdf_qa_pair_text(
    questions_path: str,
    answers_path: str,
    *,
    page_start: int | None = None,
    page_end: int | None = None,
) -> str:
    questions = fetch_pdf_text(questions_path, page_start, page_end)
    answers = fetch_pdf_text(answers_path, page_start, page_end)
    label = Path(questions_path).stem
    return (
        f"=== {label} — QUESTIONS ===\n\n{questions}\n\n"
        f"=== {label} — ANSWERS / RATIONALES ===\n\n{answers}"
    )
