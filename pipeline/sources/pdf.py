import pdfplumber


def fetch_pdf_text(
    path: str,
    page_start: int | None = None,
    page_end: int | None = None,
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
    return "\n\n".join(text_blocks)
