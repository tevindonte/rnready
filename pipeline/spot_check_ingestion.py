"""Spot-check recent Saunders gate-run inserts in Supabase."""

from __future__ import annotations

import json
import sys
from collections import Counter

import env_config  # noqa: F401

from db import get_supabase

SOURCE_ID = "pdf:saunders_qa"


def main() -> None:
    db = get_supabase()
    result = (
        db.table("questions")
        .select(
            "id, question, options, correct_answer, category, subcategory, "
            "is_ngn, ngn_type, explanation, source_verbatim, content_origin"
        )
        .eq("source_id", SOURCE_ID)
        .order("created_at", desc=True)
        .limit(100)
        .execute()
    )
    rows = result.data or []
    if not rows:
        print(f"No questions found for source_id={SOURCE_ID}")
        sys.exit(1)

    print(f"=== Spot check: {len(rows)} recent rows from {SOURCE_ID} ===\n")

    # 1. Category distribution
    cats = Counter(r["category"] for r in rows)
    print("Category distribution:")
    for cat, n in cats.most_common():
        print(f"  {cat}: {n}")
    if len(cats) == 1:
        print("  ⚠ WARNING: all questions in one category")

    # 2. Option key format (A-E vs numeric)
    numeric_opts = sum(
        1 for r in rows if any(str(k).isdigit() for k in (r.get("options") or {}).keys())
    )
    letter_opts = len(rows) - numeric_opts
    print(f"\nOption keys: letter-mapped={letter_opts} still-numeric={numeric_opts}")
    if numeric_opts:
        bad = next(r for r in rows if any(str(k).isdigit() for k in (r.get("options") or {}).keys()))
        print(f"  ⚠ Sample numeric options: {list((bad.get('options') or {}).keys())[:5]}")

    # 3. Rationale / explanation quality
    has_verbatim = sum(1 for r in rows if (r.get("source_verbatim") or "").strip())
    has_explanation = sum(1 for r in rows if (r.get("explanation") or "").strip())
    short_explanation = sum(1 for r in rows if len((r.get("explanation") or "")) < 80)
    print(f"\nRationale: source_verbatim present={has_verbatim}/{len(rows)}")
    print(f"Explanation: present={has_explanation}/{len(rows)} short(<80 chars)={short_explanation}")
    missing_both = [r for r in rows if not (r.get("source_verbatim") or "").strip() and not (r.get("explanation") or "").strip()]
    if missing_both:
        print(f"  ⚠ {len(missing_both)} rows missing both source_verbatim and explanation")

    # 4. SATA
    sata = [r for r in rows if r.get("is_ngn") and r.get("ngn_type") == "sata"]
    print(f"\nSATA items: {len(sata)}")
    for r in sata[:3]:
        print(f"  ans={r['correct_answer']} | {r['question'][:70]}...")

    # 5. Sample rows — early-range style (no rich metadata in verbatim)
    print("\n--- Sample questions (check early-range classification) ---")
    for r in rows[-5:]:
        print(f"\n[{r['category']} / {r.get('subcategory') or '?'}] ans={r['correct_answer']}")
        print(f"  Q: {r['question'][:120]}...")
        opts = r.get("options") or {}
        keys = sorted(opts.keys(), key=lambda k: k)
        print(f"  Options ({', '.join(keys)}): {list(opts.values())[0][:60] if opts else '?'}...")
        verbatim = (r.get("source_verbatim") or "")[:200]
        expl = (r.get("explanation") or "")[:200]
        print(f"  source_verbatim: {verbatim}{'...' if len(r.get('source_verbatim') or '') > 200 else ''}")
        print(f"  explanation: {expl}{'...' if len(r.get('explanation') or '') > 200 else ''}")

    print("\n=== Gate checklist ===")
    checks = [
        ("Multiple categories (not one bucket)", len(cats) >= 3),
        ("Options use A-E letters", numeric_opts == 0),
        ("Most rows have source_verbatim", has_verbatim >= len(rows) * 0.7),
        ("Explanations populated", has_explanation >= len(rows) * 0.9),
        ("At least one SATA item", len(sata) >= 1),
    ]
    for label, ok in checks:
        mark = "PASS" if ok else "FAIL"
        print(f"  [{mark}] {label}")


if __name__ == "__main__":
    main()
