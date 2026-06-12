"""Spot-check ingested questions — sample or full bank, with taxonomy audit."""

from __future__ import annotations

import argparse
import sys
from collections import Counter, defaultdict

import env_config  # noqa: F401

from db import get_supabase
from qa_rules import audit_question
from subcategories import SUBCATEGORIES, normalize_subcategory

NCLEX_CATEGORIES = list(SUBCATEGORIES.keys())
DEFAULT_SOURCE = "pdf:saunders_qa"


def fetch_questions(db, *, source_id: str | None, full: bool, limit: int) -> list[dict]:
    if full:
        rows: list[dict] = []
        offset = 0
        batch = 1000
        while True:
            query = (
                db.table("questions")
                .select(
                    "id, question, options, correct_answer, category, subcategory, "
                    "is_ngn, ngn_type, explanation, source_verbatim, content_origin, source_id"
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

    query = (
        db.table("questions")
        .select(
            "id, question, options, correct_answer, category, subcategory, "
            "is_ngn, ngn_type, explanation, source_verbatim, content_origin, source_id"
        )
        .eq("is_custom", False)
    )
    if source_id:
        query = query.eq("source_id", source_id)
    result = query.order("created_at", desc=True).limit(limit).execute()
    return result.data or []


def audit_subcategory_taxonomy(rows: list[dict]) -> None:
    print("\n=== Subcategory taxonomy audit (controlled vocabulary) ===\n")

    invalid_by_cat: dict[str, Counter[str]] = defaultdict(Counter)
    normalized_collisions: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    missing_sub = 0
    valid_count = 0

    for row in rows:
        cat = row.get("category") or ""
        raw_sub = row.get("subcategory")
        if cat not in NCLEX_CATEGORIES:
            continue
        valid_subs = set(SUBCATEGORIES[cat])
        if not raw_sub:
            missing_sub += 1
            continue
        if raw_sub in valid_subs:
            valid_count += 1
        else:
            invalid_by_cat[cat][raw_sub] += 1
            mapped = normalize_subcategory(cat, raw_sub)
            normalized_collisions[cat][f"{raw_sub} -> {mapped}"] += 1

    print(f"Valid controlled subcategories: {valid_count}/{len(rows)}")
    print(f"Missing subcategory: {missing_sub}")
    print(f"Invalid (not in vocabulary): {sum(sum(c.values()) for c in invalid_by_cat.values())}")

    for cat in NCLEX_CATEGORIES:
        cat_rows = [r for r in rows if r.get("category") == cat]
        if not cat_rows:
            print(f"\n[{cat}] — no questions")
            continue

        print(f"\n[{cat}] — {len(cat_rows)} questions")
        subs = Counter(r.get("subcategory") or "(missing)" for r in cat_rows)
        for sub_name in SUBCATEGORIES[cat]:
            count = subs.get(sub_name, 0)
            marker = " " if count else " (empty)"
            print(f"  {sub_name}: {count}{marker}")

        extras = {k: v for k, v in subs.items() if k not in SUBCATEGORIES[cat] and k != "(missing)"}
        if extras:
            print("  --- OFF-VOCABULARY (fragmentation risk) ---")
            for name, count in extras.most_common(15):
                mapped = normalize_subcategory(cat, name)
                fix_note = f" -> would map to '{mapped}'" if mapped != name else ""
                print(f"  '{name}': {count}{fix_note}")
            if len(extras) > 15:
                print(f"  ... and {len(extras) - 15} more off-vocabulary values")

    if normalized_collisions:
        print("\n--- Near-duplicate clusters (raw values mapping to same controlled sub) ---")
        for cat in NCLEX_CATEGORIES:
            clusters: dict[str, list[str]] = defaultdict(list)
            for label, count in normalized_collisions.get(cat, {}).items():
                if " -> " not in label:
                    continue
                raw, mapped = label.split(" -> ", 1)
                if raw != mapped:
                    clusters[mapped].append(f"{raw} ({count})")
            for mapped, raws in sorted(clusters.items()):
                if len(raws) >= 2:
                    print(f"  {cat} / {mapped}: {', '.join(raws)}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Spot-check ingested questions in Supabase")
    parser.add_argument("--source", default=DEFAULT_SOURCE, help="source_id filter (empty = all shared)")
    parser.add_argument("--full", action="store_true", help="Scan entire bank (paginated), not just recent sample")
    parser.add_argument("--limit", type=int, default=100, help="Sample size when not using --full")
    args = parser.parse_args()

    source_id = args.source or None
    db = get_supabase()
    rows = fetch_questions(db, source_id=source_id, full=args.full, limit=args.limit)

    if not rows:
        label = source_id or "all shared"
        print(f"No questions found for {label}")
        sys.exit(1)

    scope = f"FULL BANK ({len(rows)} rows)" if args.full else f"sample ({len(rows)} recent rows)"
    src_label = source_id or "all shared sources"
    print(f"=== Spot check: {scope} — {src_label} ===\n")

    cats = Counter(r["category"] for r in rows)
    print("Category distribution:")
    for cat in NCLEX_CATEGORIES:
        n = cats.get(cat, 0)
        pct = 100 * n / len(rows) if rows else 0
        print(f"  {cat}: {n} ({pct:.1f}%)")
    unknown_cats = {k: v for k, v in cats.items() if k not in NCLEX_CATEGORIES}
    if unknown_cats:
        print("  --- UNKNOWN CATEGORIES ---")
        for k, v in unknown_cats.items():
            print(f"  {k}: {v}")

    numeric_opts = sum(
        1 for r in rows if any(str(k).isdigit() for k in (r.get("options") or {}).keys())
    )
    print(f"\nOption keys: letter-mapped={len(rows) - numeric_opts} still-numeric={numeric_opts}")

    has_verbatim = sum(1 for r in rows if (r.get("source_verbatim") or "").strip())
    has_explanation = sum(1 for r in rows if (r.get("explanation") or "").strip())
    print(f"Rationale: source_verbatim={has_verbatim}/{len(rows)}")
    print(f"Explanation: present={has_explanation}/{len(rows)}")

    sata = [r for r in rows if r.get("is_ngn") and r.get("ngn_type") == "sata"]
    print(f"SATA items: {len(sata)}")

    det_issues: Counter[str] = Counter()
    failing = 0
    for row in rows:
        issues = audit_question(row)
        if issues:
            failing += 1
            for i in issues:
                det_issues[i] += 1
    print(f"\nDeterministic QA failures: {failing}/{len(rows)}")
    if det_issues:
        for issue, count in det_issues.most_common():
            print(f"  {issue}: {count}")
    letter_suspect = det_issues.get("answer_letter_mismatch_suspect", 0)
    if letter_suspect:
        print(
            f"\n  NOTE: {letter_suspect} answer_letter_mismatch_suspect — "
            "run qa_critic.py --llm to verify (never auto-fixed)"
        )

    if args.full:
        audit_subcategory_taxonomy(rows)

    print("\n=== Checklist ===")
    invalid_sub = det_issues.get("invalid_subcategory", 0)
    checks = [
        ("All 8 categories represented", len([c for c in NCLEX_CATEGORIES if cats.get(c, 0) > 0]) >= 7),
        ("Options use A-E letters", numeric_opts == 0),
        ("Explanations populated (>=90%)", has_explanation >= len(rows) * 0.9),
        ("Invalid subcategories < 5%", args.full and invalid_sub < len(rows) * 0.05 or not args.full),
        ("No unknown categories", len(unknown_cats) == 0),
    ]
    for label, ok in checks:
        mark = "PASS" if ok else "FAIL"
        print(f"  [{mark}] {label}")

    if args.full and invalid_sub > 0:
        print("\nTip: run `python qa_critic.py --fix-subcategories --source pdf:saunders_qa` to normalize invalid subs")


if __name__ == "__main__":
    main()
