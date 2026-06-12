import json
import logging
import re
import time
from typing import Literal

from openai import OpenAI
from pydantic import BaseModel, field_validator, model_validator

logger = logging.getLogger(__name__)

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

Category = Literal[
    "Management of Care",
    "Safety and Infection Control",
    "Pharmacological and Parenteral Therapies",
    "Physiological Adaptation",
    "Reduction of Risk Potential",
    "Basic Care and Comfort",
    "Health Promotion and Maintenance",
    "Psychosocial Integrity",
]

ContentOrigin = Literal["extracted", "generated"]

EXTRACTION_SYSTEM = """
You are an NCLEX content extraction engine. You will be given raw text from
a nursing study source (YouTube transcript, PDF page, or webpage). The text
may contain:

A) Explicit practice questions — a question stem, multiple answer choices,
   and possibly a stated correct answer and/or rationale.

B) Fact-based content with no explicit question — flashcard-style
   prompt/answer pairs, definitions, comparison tables, or plain clinical
   facts (e.g. "Epiglottitis is caused by Haemophilus influenzae").

For TYPE A (explicit questions):
- Copy the question stem and answer options VERBATIM. Do not reword.
- If correct answer is stated, copy it exactly.
- If a rationale is stated, copy it into "source_rationale" verbatim.
- Set "content_origin": "extracted"
- Set "source_fact": null

For TYPE B (fact content, no explicit question):
- Identify a single clinically testable fact (e.g. "Sweat chloride >60 mEq/L
  indicates Cystic Fibrosis")
- Write "source_fact": the fact AS STATED in the source, verbatim or near-verbatim
- Build a clinical scenario MCQ stem around that fact
- The CORRECT option must restate the source_fact accurately
- Generate 3 plausible distractors using OTHER facts from the same source
  text if available. Distractors must be factually true statements about
  something else — never invented numbers.
- Set "content_origin": "generated"
- "source_rationale": null

For BOTH types:
- Classify "category" into exactly one of the 8 NCLEX categories (list below)
- Classify "subcategory" — a short specific topic (e.g. "Cardiac", "Cystic Fibrosis")
- If SATA: is_ngn: true, ngn_type: "sata", correct_answer as "A,C,D"
- Otherwise is_ngn: false, ngn_type: null, correct_answer single letter

NCLEX categories:
- Management of Care
- Safety and Infection Control
- Pharmacological and Parenteral Therapies
- Physiological Adaptation
- Reduction of Risk Potential
- Basic Care and Comfort
- Health Promotion and Maintenance
- Psychosocial Integrity

OUTPUT FORMAT — strict:
Return a JSON array. "options" is ALWAYS an object like
{"A": "...", "B": "...", "C": "...", "D": "..."} — NEVER an array.
Every object MUST include: question, options, correct_answer, category,
subcategory, is_ngn, ngn_type, content_origin, source_fact, source_rationale.

If the text contains nothing usable, return [].
"""


class ExtractedQuestion(BaseModel):
    question: str
    options: dict[str, str]
    correct_answer: str
    category: Category
    subcategory: str | None = None
    content_origin: ContentOrigin = "extracted"
    source_fact: str | None = None
    source_verbatim: str | None = None
    difficulty: Literal["easy", "medium", "hard"] | None = None
    is_ngn: bool = False
    ngn_type: str | None = None

    @field_validator("options")
    @classmethod
    def validate_options(cls, v: dict[str, str]) -> dict[str, str]:
        if len(v) < 2:
            raise ValueError("options must have at least 2 entries")
        return v

    @model_validator(mode="after")
    def detect_sata(self) -> "ExtractedQuestion":
        if "," in self.correct_answer:
            self.is_ngn = True
            self.ngn_type = "sata"
        return self


def normalize_options(raw: object) -> dict[str, str]:
    if isinstance(raw, dict):
        return {str(k).upper().strip(): str(v).strip() for k, v in raw.items() if str(v).strip()}

    if isinstance(raw, list):
        result: dict[str, str] = {}
        letters = "ABCDEFGHIJ"
        for i, item in enumerate(raw):
            text = str(item).strip()
            match = re.match(r"^([A-J])[.\):\s]\s*(.+)$", text, re.I)
            if match:
                result[match.group(1).upper()] = match.group(2).strip()
            elif i < len(letters):
                result[letters[i]] = text
        return result

    raise ValueError(f"options must be dict or list, got {type(raw)}")


def normalize_category(raw: object) -> str | None:
    if not raw:
        return None
    text = str(raw).strip()
    lower = text.lower()
    for cat in NCLEX_CATEGORIES:
        if cat.lower() == lower or cat.lower() in lower:
            return cat
    return None


def normalize_item(raw: dict) -> dict:
    item = dict(raw)
    item["options"] = normalize_options(item.get("options", {}))

    rationale = item.pop("source_rationale", None)
    if rationale and not item.get("source_verbatim"):
        item["source_verbatim"] = rationale

    cat = normalize_category(item.get("category"))
    if cat:
        item["category"] = cat

    origin = item.get("content_origin", "extracted")
    item["content_origin"] = origin if origin in ("extracted", "generated") else "extracted"

    if item.get("correct_answer"):
        item["correct_answer"] = str(item["correct_answer"]).upper().replace(" ", "")

    return item


def parse_question_item(raw: dict) -> ExtractedQuestion | None:
    try:
        item = normalize_item(raw)
        if not item.get("category"):
            logger.warning("Skipping question — missing category: %.60s...", item.get("question", ""))
            return None
        if len(item.get("options", {})) < 2:
            return None
        return ExtractedQuestion.model_validate(item)
    except Exception as exc:
        logger.warning("Skipping invalid question: %s", exc)
        return None


def _parse_json_array(content: str) -> list[dict]:
    content = content.strip()
    if content.startswith("```"):
        content = re.sub(r"^```(?:json)?\n?", "", content)
        content = re.sub(r"\n?```$", "", content)
    data = json.loads(content)
    if not isinstance(data, list):
        raise ValueError("Expected JSON array")
    return data


def extract_questions(
    client: OpenAI,
    text: str,
    *,
    retries: int = 3,
    target_count: int | None = None,
) -> list[ExtractedQuestion]:
    user_content = text
    if target_count:
        user_content = (
            f"Generate approximately {target_count} questions total from this content. "
            "Prioritize TYPE B (generated) since user notes are typically fact-dense.\n\n"
            + text
        )

    last_error: Exception | None = None
    for attempt in range(retries):
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": EXTRACTION_SYSTEM},
                    {"role": "user", "content": user_content},
                ],
                temperature=0,
            )
            raw = response.choices[0].message.content or "[]"
            items = _parse_json_array(raw)
            results: list[ExtractedQuestion] = []
            for item in items:
                if not isinstance(item, dict):
                    continue
                q = parse_question_item(item)
                if q:
                    results.append(q)
            return results
        except json.JSONDecodeError as exc:
            last_error = exc
            time.sleep(2 ** attempt)
        except Exception as exc:
            last_error = exc
            time.sleep(2 ** attempt)

    raise RuntimeError(f"Extraction failed after {retries} attempts: {last_error}")
