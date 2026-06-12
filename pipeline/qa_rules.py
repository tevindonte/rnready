"""Deterministic QA rules for ingested NCLEX questions."""

from __future__ import annotations

import re

from subcategories import SUBCATEGORIES, normalize_subcategory

NCLEX_CATEGORIES = list(SUBCATEGORIES.keys())

# Common clinical filler — skip when echo-checking option text in rationale
_STOPWORDS = frozenset(
    {
        "client",
        "nurse",
        "patient",
        "should",
        "would",
        "could",
        "because",
        "during",
        "after",
        "before",
        "which",
        "their",
        "there",
        "these",
        "those",
        "other",
        "about",
        "being",
        "having",
    }
)


def _significant_words(text: str, min_len: int = 5) -> list[str]:
    words = re.findall(r"[a-z]{6,}", text.lower())
    return [w for w in words if w not in _STOPWORDS][:8]


def _combined_rationale(row: dict) -> str:
    return " ".join(
        part
        for part in (
            (row.get("explanation") or ""),
            (row.get("source_verbatim") or ""),
            (row.get("source_rationale") or ""),
        )
        if part
    )


def check_answer_letter_consistency(row: dict) -> tuple[bool, str | None]:
    """
    Heuristic: option text at correct_answer letter(s) should be echoed in
    explanation/source rationale. Flags suspected 1→A mapping errors (e.g.
    Saunders Answer: 3 marked C but rationale discusses option D's content).

    Never auto-fix — flag only.
    """
    opts: dict = row.get("options") or {}
    correct_raw = (row.get("correct_answer") or "").upper().replace(" ", "")
    if not correct_raw or not opts:
        return True, None

    rationale = _combined_rationale(row).lower()
    if len(rationale) < 40:
        return True, None  # missing/short handled elsewhere

    correct_letters = [l.strip() for l in correct_raw.split(",") if l.strip()]
    failed_letters: list[str] = []

    for letter in correct_letters:
        opt_text = str(opts.get(letter) or opts.get(letter.upper()) or "").strip()
        if not opt_text:
            continue
        sig = _significant_words(opt_text)
        if not sig:
            continue
        if not any(w in rationale for w in sig):
            failed_letters.append(letter)

    if failed_letters:
        return (
            False,
            f"correct_answer '{','.join(failed_letters)}' option text not echoed in "
            "explanation/rationale — possible numeric-to-letter mapping error",
        )

    # Secondary: rationale explicitly names a different option letter/number
    hint_letters = _extract_rationale_answer_hints(_combined_rationale(row))
    marked = set(correct_letters)
    if hint_letters and not hint_letters.intersection(marked):
        hinted = ",".join(sorted(hint_letters))
        marked_s = ",".join(sorted(marked))
        return (
            False,
            f"rationale references option(s) {hinted} but correct_answer is {marked_s} — "
            "possible answer letter mismatch",
        )

    return True, None


def _extract_rationale_answer_hints(text: str) -> set[str]:
    """Letters explicitly cited as correct in rationale (option 3, Option C, answer is 2)."""
    hints: set[str] = set()
    patterns = [
        r"\b(?:correct\s+)?(?:answer|option)\s+(?:is\s+)?([A-E]|\d)\b",
        r"\boption\s+([A-E]|\d)\s+(?:is\s+)?(?:correct|best|priority)\b",
        r"\b(?:the\s+)?(?:best|correct)\s+(?:answer\s+is\s+)?(?:option\s+)?([A-E]|\d)\b",
    ]
    for pattern in patterns:
        for match in re.finditer(pattern, text, re.I):
            val = match.group(1).upper()
            if val.isdigit():
                n = int(val)
                if 1 <= n <= 10:
                    hints.add(chr(ord("A") + n - 1))
            elif val in "ABCDE":
                hints.add(val)
    return hints


def audit_question(row: dict) -> list[str]:
    issues: list[str] = []
    cat = row.get("category") or ""
    sub = row.get("subcategory")
    question = (row.get("question") or "").strip()
    explanation = (row.get("explanation") or "").strip()
    opts: dict = row.get("options") or {}
    correct = (row.get("correct_answer") or "").upper().replace(" ", "")

    if cat not in NCLEX_CATEGORIES:
        issues.append("invalid_category")
    if len(question) < 20:
        issues.append("question_too_short")
    if len(opts) < 2:
        issues.append("too_few_options")
    if any(str(k).isdigit() for k in opts):
        issues.append("numeric_option_keys")

    option_letters = {str(k).upper().strip() for k in opts}
    if correct:
        for letter in correct.split(","):
            if letter and letter not in option_letters:
                issues.append("answer_not_in_options")
                break

    if not explanation:
        issues.append("missing_explanation")
    elif len(explanation) < 40:
        issues.append("explanation_too_short")

    valid_subs = SUBCATEGORIES.get(cat, [])
    if cat in NCLEX_CATEGORIES:
        if not sub:
            issues.append("missing_subcategory")
        elif sub not in valid_subs:
            issues.append("invalid_subcategory")

    if row.get("is_ngn") and row.get("ngn_type") == "sata" and "," not in correct:
        issues.append("sata_missing_multi_answer")

    ok, letter_msg = check_answer_letter_consistency(row)
    if not ok:
        issues.append("answer_letter_mismatch_suspect")

    return issues


def answer_letter_mismatch_detail(row: dict) -> str | None:
    ok, msg = check_answer_letter_consistency(row)
    return msg if not ok else None


def suggested_subcategory_fix(row: dict) -> str | None:
    cat = row.get("category")
    sub = row.get("subcategory")
    if cat not in NCLEX_CATEGORIES:
        return None
    fixed = normalize_subcategory(cat, sub)
    if fixed != sub:
        return fixed
    return None
