"""Reclassify questions to controlled subcategories."""

from __future__ import annotations

import json
import logging
import sys
import time

from openai import OpenAI

import env_config  # noqa: F401 — loads pipeline/.env via load_dotenv

from db import get_supabase
from subcategories import SUBCATEGORIES, normalize_subcategory, format_subcategory_prompt

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

CLASSIFY_SYSTEM = f"""You classify NCLEX questions into a controlled subcategory.
Given a question stem and its NCLEX category, return ONLY the subcategory name
from the list below. Pick the closest match — do not invent new names.
If nothing fits, use the category's "General" subcategory.

{format_subcategory_prompt()}

Respond with JSON: {{"subcategory": "..."}}"""


def classify_subcategory(client: OpenAI, category: str, question: str) -> str:
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": CLASSIFY_SYSTEM},
            {
                "role": "user",
                "content": f"Category: {category}\n\nQuestion:\n{question[:1500]}",
            },
        ],
        temperature=0,
    )
    raw = response.choices[0].message.content or "{}"
    raw = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    data = json.loads(raw)
    return normalize_subcategory(category, data.get("subcategory"))


def main() -> None:
    sb = get_supabase()
    client = OpenAI()

    valid = {sub for subs in SUBCATEGORIES.values() for sub in subs}

    offset = 0
    batch = 50
    updated = 0

    while True:
        result = (
            sb.table("questions")
            .select("id, category, subcategory, question")
            .eq("is_custom", False)
            .range(offset, offset + batch - 1)
            .execute()
        )
        rows = result.data or []
        if not rows:
            break

        for row in rows:
            cat = row["category"]
            current = row.get("subcategory")
            if current in valid and SUBCATEGORIES.get(cat, []) and current in SUBCATEGORIES[cat]:
                continue

            try:
                sub = classify_subcategory(client, cat, row["question"])
                sb.table("questions").update({"subcategory": sub}).eq("id", row["id"]).execute()
                updated += 1
                logger.info("Updated %s → %s / %s", row["id"][:8], cat, sub)
                time.sleep(0.2)
            except Exception as exc:
                logger.warning("Failed %s: %s", row["id"], exc)

        offset += batch

    logger.info("Done. Updated %d questions.", updated)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
