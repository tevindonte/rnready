"""Map Saunders/Kaplan exam-book metadata to RNReady NCLEX categories."""

from __future__ import annotations

from subcategories import normalize_subcategory

NCLEX_CATEGORIES = [
    "Management of Care",
    "Safety and Infection Control",
    "Pharmacological and Parenteral Therapies",
    "Physiological Adaptation",
    "Reduction of Risk Potential",
    "Basic Care and Comfort",
    "Health Promotion and Maintenance",
    "Psychosocial Integrity",
]

_CATEGORY_FRAGMENTS: list[tuple[str, str]] = [
    ("management of care", "Management of Care"),
    ("safe and effective care environment", "Management of Care"),
    ("safety and infection control", "Safety and Infection Control"),
    ("infection control", "Safety and Infection Control"),
    ("pharmacological and parenteral therapies", "Pharmacological and Parenteral Therapies"),
    ("pharmacology", "Pharmacological and Parenteral Therapies"),
    ("pharmacological", "Pharmacological and Parenteral Therapies"),
    ("physiological adaptation", "Physiological Adaptation"),
    ("physiological integrity", "Physiological Adaptation"),
    ("reduction of risk potential", "Reduction of Risk Potential"),
    ("basic care and comfort", "Basic Care and Comfort"),
    ("health promotion and maintenance", "Health Promotion and Maintenance"),
    ("psychosocial integrity", "Psychosocial Integrity"),
]


def map_exam_book_category(raw: str | None) -> str | None:
    """Map Client Needs / Category metadata to one of our 8 NCLEX categories."""
    if not raw:
        return None
    text = raw.strip().lower()

    for cat in NCLEX_CATEGORIES:
        if cat.lower() == text or cat.lower() in text:
            return cat

    segments = [s.strip().lower() for s in text.replace("\\", "/").split("/") if s.strip()]
    for segment in reversed(segments):
        for fragment, category in _CATEGORY_FRAGMENTS:
            if fragment in segment or segment in fragment:
                return category

    for fragment, category in _CATEGORY_FRAGMENTS:
        if fragment in text:
            return category

    return None


def map_exam_book_subcategory(category: str, *hints: str | None) -> str | None:
    """Pick subcategory from Content Area / Health Problem / Category tail segments."""
    combined = " ".join(h for h in hints if h).strip()
    if not combined:
        return None
    return normalize_subcategory(category, combined)


EXAM_BOOK_METADATA_PROMPT = """
EXAM BOOK SOURCES (Saunders Q&A, Kaplan Prep Plus):
This text may include explicit metadata after each question's rationale, such as:
  "Client Needs: Physiological Integrity"
  "Content Area: Pharmacology"
  "Health Problem: Adult Health: Cardiovascular: Heart Failure"
  "Category: Planning/Safe and Effective Care Environment/Safety and Infection Control"
  "Priority Nursing Tip: ..."
  "Test-Taking Strategy: ..."

If this metadata is present, USE IT as the PRIMARY signal for category and subcategory:
- Map "Client Needs" or the middle/last segment of "Category" to one of our 8 NCLEX categories
  using standard NCLEX test-plan mapping (see Saunders Client Needs mapping below).
- Use "Content Area", "Health Problem", or the most specific "Category" segment to pick
  the closest subcategory from the controlled list.

Saunders Client Needs mapping:
  Safe and Effective Care Environment → Management of Care OR Safety and Infection Control
    (use sub-label: "Management of Care" vs "Safety and Infection Control")
  Health Promotion and Maintenance → Health Promotion and Maintenance
  Psychosocial Integrity → Psychosocial Integrity
  Physiological Integrity → one of:
    Basic Care and Comfort | Pharmacological and Parenteral Therapies |
    Reduction of Risk Potential | Physiological Adaptation
    (use Content Area / sub-label to decide)

For TYPE A questions from exam books:
- Copy question stem and options verbatim. Saunders may use numbered options (1-5) — convert to A-E.
- Copy the full "Rationale:" text into "source_rationale" verbatim.
- If "Priority Nursing Tip" or "Test-Taking Strategy" appear, append them to source_rationale
  (separated by blank lines) — they help explanation quality.
- SATA: detect "Select all that apply" → is_ngn true, correct_answer comma-separated letters.
"""
