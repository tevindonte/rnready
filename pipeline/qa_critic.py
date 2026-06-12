"""Retroactive QA critic batch job over all ingested shared questions."""

from __future__ import annotations

import argparse
import json
import logging
import sys
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from openai import OpenAI

import env_config  # noqa: F401

from db import get_supabase
from qa_rules import (
    NCLEX_CATEGORIES,
    answer_letter_mismatch_detail,
    audit_question,
    suggested_subcategory_fix,
)
from subcategories import normalize_subcategory

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

PIPELINE_DIR = Path(__file__).parent

CRITIC_SYSTEM = """You are a QA critic for NCLEX RN practice questions stored in a database.

Review the question for structural and clinical coherence. Return JSON only:
{
  "verdict": "pass" | "fail" | "needs_review",
  "issues": ["short issue strings"],
  "correct_answer_valid": true | false,
  "category_reasonable": true | false,
  "suggested_subcategory": null or one controlled subcategory name for the given category
}

CRITICAL — answer letter mismatch check:
Compare the option text marked as correct_answer against the explanation and source
rationale. If the reasoning clearly supports a DIFFERENT option than the labeled
correct_answer (common when numeric source answers 1-4 were mis-mapped to A-D),
set verdict to "fail", correct_answer_valid to false, and include an issue like:
"answer_letter_mismatch — explanation supports option X, not labeled Y".
Flag this even if the stem, options, and category all look fine.

Also fail if: nonsensical stem, correct answer contradicts options, obvious extraction
garbage, duplicate/truncated text, or category clearly wrong.
needs_review if minor concerns. pass if usable as-is."""


def fetch_all_shared(db, source_id: str | None = None) -> list[dict]:
    rows: list[dict] = []
    offset = 0
    batch = 1000
    while True:
        query = (
            db.table("questions")
            .select(
                "id, question, options, correct_answer, category, subcategory, "
                "is_ngn, ngn_type, explanation, source_verbatim, source_id, content_origin"
            )
            .eq("is_custom", False)
        )
        if source_id:
            query = query.eq("source_id", source_id)
        result = query.order("created_at").range(offset, offset + batch - 1).execute()
        chunk = result.data or []
        if not chunk:
            break
        rows.extend(chunk)
        if len(chunk) < batch:
            break
        offset += batch
    return rows


def llm_critic(client: OpenAI, row: dict, *, letter_mismatch_hint: str | None = None) -> dict:
    opts = row.get("options") or {}
    options_text = "\n".join(f"{k}. {v}" for k, v in sorted(opts.items(), key=lambda x: str(x[0])))
    user = f"""Category: {row.get('category')}
Subcategory: {row.get('subcategory')}

Question: {row.get('question')}

Options:
{options_text}

Correct answer: {row.get('correct_answer')}

Explanation: {row.get('explanation') or '(none)'}

Source rationale (verbatim from book): {row.get('source_verbatim') or '(none)'}
"""
    if letter_mismatch_hint:
        user += f"\nDeterministic pre-check flagged: {letter_mismatch_hint}\n"
        user += "Verify whether correct_answer letter matches what the rationale actually supports.\n"

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": CRITIC_SYSTEM},
            {"role": "user", "content": user},
        ],
        temperature=0,
    )
    raw = (response.choices[0].message.content or "{}").strip()
    raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    return json.loads(raw)


def main() -> None:
    parser = argparse.ArgumentParser(description="Retroactive QA critic over ingested questions")
    parser.add_argument("--source", default=None, help="Filter by source_id (e.g. pdf:saunders_qa)")
    parser.add_argument("--fix-subcategories", action="store_true", help="Auto-fix invalid subcategories via normalize")
    parser.add_argument("--llm", action="store_true", help="Run LLM critic on deterministic failures")
    parser.add_argument("--llm-all", action="store_true", help="Run LLM critic on every question (slow/costly)")
    parser.add_argument("--limit", type=int, default=0, help="Max questions to process (0 = all)")
    parser.add_argument(
        "--checkpoint-every",
        type=int,
        default=100,
        help="Log progress every N questions",
    )
    args = parser.parse_args()

    db = get_supabase()
    client = OpenAI() if (args.llm or args.llm_all) else None

    logger.info("Loading shared questions%s...", f" source={args.source}" if args.source else "")
    rows = fetch_all_shared(db, args.source)
    if args.limit:
        rows = rows[: args.limit]
    total = len(rows)
    if not total:
        logger.error("No questions found")
        sys.exit(1)

    logger.info("QA critic: %d questions", total)

    issue_counts: Counter[str] = Counter()
    verdict_counts: Counter[str] = Counter()
    letter_mismatch_count = 0
    fixed_subcategories = 0
    flagged: list[dict] = []
    processed = 0

    for row in rows:
        processed += 1
        qid = row["id"]
        issues = audit_question(row)
        letter_detail = answer_letter_mismatch_detail(row)
        if letter_detail:
            letter_mismatch_count += 1
        for issue in issues:
            issue_counts[issue] += 1

        fix = suggested_subcategory_fix(row)
        if args.fix_subcategories and fix:
            db.table("questions").update({"subcategory": fix}).eq("id", qid).execute()
            fixed_subcategories += 1
            if "invalid_subcategory" in issues:
                issues = [i for i in issues if i != "invalid_subcategory"]

        # Never auto-fix answer letter issues — flag for LLM / manual review only
        llm_result = None
        run_llm = args.llm_all or (args.llm and bool(issues))
        if run_llm and client:
            try:
                llm_result = llm_critic(client, row, letter_mismatch_hint=letter_detail)
                verdict = llm_result.get("verdict", "needs_review")
                verdict_counts[verdict] += 1
                if verdict != "pass":
                    flagged.append(
                        {
                            "id": qid,
                            "deterministic_issues": issues,
                            "answer_letter_detail": letter_detail,
                            "llm": llm_result,
                            "question_preview": (row.get("question") or "")[:120],
                            "correct_answer": row.get("correct_answer"),
                            "category": row.get("category"),
                            "subcategory": row.get("subcategory"),
                        }
                    )
                suggested = llm_result.get("suggested_subcategory")
                if (
                    args.fix_subcategories
                    and suggested
                    and row.get("category") in NCLEX_CATEGORIES
                ):
                    normalized = normalize_subcategory(row["category"], suggested)
                    if normalized != row.get("subcategory"):
                        db.table("questions").update({"subcategory": normalized}).eq("id", qid).execute()
                        fixed_subcategories += 1
                time.sleep(0.15)
            except Exception as exc:
                logger.warning("LLM critic failed %s: %s", qid[:8], exc)
        elif not issues:
            verdict_counts["pass"] += 1
        else:
            verdict_counts["deterministic_fail"] += 1
            flagged.append(
                {
                    "id": qid,
                    "deterministic_issues": issues,
                    "answer_letter_detail": letter_detail,
                    "llm": None,
                    "question_preview": (row.get("question") or "")[:120],
                    "correct_answer": row.get("correct_answer"),
                    "category": row.get("category"),
                    "subcategory": row.get("subcategory"),
                }
            )

        if processed % args.checkpoint_every == 0 or processed == total:
            logger.info(
                "[CHECKPOINT qa %d/%d] pass=%d deterministic_fail=%d letter_mismatch_suspect=%d llm_fail=%d fixed_sub=%d",
                processed,
                total,
                verdict_counts.get("pass", 0),
                verdict_counts.get("deterministic_fail", 0),
                letter_mismatch_count,
                verdict_counts.get("fail", 0) + verdict_counts.get("needs_review", 0),
                fixed_subcategories,
            )

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_filter": args.source,
        "total": total,
        "fixed_subcategories": fixed_subcategories,
        "answer_letter_mismatch_suspects": letter_mismatch_count,
        "deterministic_issue_counts": dict(issue_counts),
        "verdict_counts": dict(verdict_counts),
        "flagged_count": len(flagged),
        "flagged_sample": flagged[:200],
    }

    out_path = PIPELINE_DIR / "qa_critic_report.json"
    out_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    logger.info("Done. flagged=%d fixed_subcategories=%d report=%s", len(flagged), fixed_subcategories, out_path)
    logger.info("Top deterministic issues: %s", issue_counts.most_common(10))


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
