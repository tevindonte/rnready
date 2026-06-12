"""Parse Quizlet JSON export (term + definition) into structured question dicts."""

from __future__ import annotations

import json
import re
from pathlib import Path

OPTION_LINE = re.compile(
    r"^([1-9]|[A-J])[.)]\s*(.+)$",
    re.IGNORECASE,
)
INLINE_OPTION = re.compile(
    r"^([a-j])[.)]\s+(.+)$",
    re.IGNORECASE,
)
INLINE_OPTION_BARE = re.compile(
    r"^([a-j])\s+(.+)$",
    re.IGNORECASE,
)
LETTER_ANSWER = re.compile(r"[A-J]", re.IGNORECASE)
NUMERIC_ANSWER = re.compile(r"[1-9]")


def _guess_category(question: str) -> str:
    q = question.lower()
    if any(w in q for w in ("delegate", "assignment", "priorit", "consent", "legal", "ethical")):
        return "Management of Care"
    if any(w in q for w in ("infection", "isolation", "ppe", "hand hygiene", "sterile", "asepsis")):
        return "Safety and Infection Control"
    if any(
        w in q
        for w in (
            "medication",
            "prescribed",
            "drug",
            "dose",
            "heparin",
            "insulin",
            "antibiotic",
            "digoxin",
            "iv ",
            "intravenous",
        )
    ):
        return "Pharmacological and Parenteral Therapies"
    if any(w in q for w in ("comfort", "hygiene", "nutrition", "elimination", "sleep", "position")):
        return "Basic Care and Comfort"
    if any(w in q for w in ("pregnant", "newborn", "infant", "immuniz", "screening", "development")):
        return "Health Promotion and Maintenance"
    if any(w in q for w in ("anxiety", "depression", "grief", "abuse", "psych", "coping", "therapeutic")):
        return "Psychosocial Integrity"
    if any(w in q for w in ("lab ", "diagnostic", "vital sign", "risk", "monitor")):
        return "Reduction of Risk Potential"
    return "Physiological Adaptation"


def _parse_options_from_term(term: str) -> tuple[str, dict[str, str], bool]:
    lines = [ln.strip() for ln in term.replace("\r", "").split("\n") if ln.strip()]
    is_sata = bool(re.search(r"\bSATA\b|select all that apply", term, re.I))

    option_lines: list[tuple[str, str]] = []
    stem_lines: list[str] = []
    for line in lines:
        m = OPTION_LINE.match(line) or INLINE_OPTION.match(line) or INLINE_OPTION_BARE.match(line)
        if m:
            key, text = m.group(1).upper(), m.group(2).strip()
            if key.isdigit():
                letters = "ABCDEFGHIJ"
                idx = int(key) - 1
                if idx < len(letters):
                    key = letters[idx]
            option_lines.append((key, text))
        else:
            if not option_lines:
                stem_lines.append(line)
            elif re.match(r"^[1-9A-J][.)]?$", line, re.I):
                continue
            else:
                stem_lines.append(line)

    if not option_lines:
        # fallback: split on embedded \n options like "a foo\nb bar"
        for line in lines:
            m = INLINE_OPTION.match(line)
            if m:
                option_lines.append((m.group(1).upper(), m.group(2).strip()))

    stem = " ".join(stem_lines).strip()
    if not stem and lines:
        stem = lines[0]
    options = {k: v for k, v in option_lines}
    return stem, options, is_sata


def _parse_answer(definition: str, options: dict[str, str], is_sata: bool) -> str:
    raw = definition.strip()
    if not raw:
        raise ValueError("empty definition")

    letters = "ABCDEFGHIJ"
    if re.search(r"select all|sata", raw, re.I):
        is_sata = True

    # Numeric answers like "1." or "1, 2, 5"
    if re.search(r"\d", raw) and not re.search(r"[A-J]", raw, re.I):
        nums = [int(n) for n in re.findall(r"\d+", raw)]
        ans = [letters[n - 1] for n in nums if 0 < n <= len(letters)]
        return ",".join(dict.fromkeys(ans))

    # Letter answers: "a\nb", "D", "a d e f", "B (short acting)"
    cleaned = re.sub(r"\([^)]*\)", "", raw)
    found = [c.upper() for c in LETTER_ANSWER.findall(cleaned)]
    found = [c for c in found if c in options or is_sata]
    if not found and options:
        found = [c.upper() for c in LETTER_ANSWER.findall(raw)]
    if len(found) == 1:
        return found[0]
    if len(found) > 1:
        return ",".join(dict.fromkeys(found))
    raise ValueError(f"could not parse answer: {raw!r}")


def _load_quizlet_cards(text: str) -> list[dict]:
    """Parse one or more concatenated JSON arrays from a Quizlet export file."""
    text = text.strip()
    if not text:
        return []

    try:
        data = json.loads(text)
        if isinstance(data, list):
            return [c for c in data if isinstance(c, dict)]
    except json.JSONDecodeError:
        pass

    cards: list[dict] = []
    decoder = json.JSONDecoder()
    idx = 0
    while idx < len(text):
        while idx < len(text) and text[idx].isspace():
            idx += 1
        if idx >= len(text):
            break
        chunk, end = decoder.raw_decode(text, idx)
        if isinstance(chunk, list):
            cards.extend(c for c in chunk if isinstance(c, dict))
        idx = end
    return cards


def parse_quizlet_export(path: str) -> list[dict]:
    text = Path(path).read_text(encoding="utf-8-sig").strip()
    if not text:
        raise ValueError(f"Quizlet export is empty: {path}")
    cards = _load_quizlet_cards(text)
    if not cards:
        raise ValueError("Quizlet export contains no cards")

    results: list[dict] = []
    for card in cards:
        term = str(card.get("term") or "").strip()
        definition = str(card.get("definition") or "").strip()
        if not term or not definition:
            continue
        try:
            stem, options, is_sata = _parse_options_from_term(term)
            if len(options) < 2:
                continue
            correct = _parse_answer(definition, options, is_sata)
            category = _guess_category(stem)
            results.append(
                {
                    "question": stem,
                    "options": options,
                    "correct_answer": correct,
                    "category": category,
                    "subcategory": "General",
                    "is_ngn": is_sata or "," in correct,
                    "ngn_type": "sata" if (is_sata or "," in correct) else None,
                    "content_origin": "extracted",
                    "source_fact": None,
                    "source_rationale": definition,
                }
            )
        except Exception:
            continue
    return results
