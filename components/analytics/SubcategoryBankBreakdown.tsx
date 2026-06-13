"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ArrowRight } from "lucide-react";
import { NCLEX_CATEGORIES, type NclexCategory } from "@/lib/constants";
import { SUBCATEGORIES } from "@/lib/subcategories";
import { formatQuestionCount } from "@/lib/question-bank";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type SubcategoryBankBreakdownProps = {
  byCategory: { category: string; count: number }[];
  bySubcategory: Record<string, Record<string, number>>;
};

function generalSharePct(categoryTotal: number, generalCount: number): number {
  if (categoryTotal <= 0) return 0;
  return Math.round((generalCount / categoryTotal) * 100);
}

export function SubcategoryBankBreakdown({
  byCategory,
  bySubcategory,
}: SubcategoryBankBreakdownProps) {
  const [expanded, setExpanded] = useState<string | null>(NCLEX_CATEGORIES[0]);

  const categoryTotals = Object.fromEntries(byCategory.map((r) => [r.category, r.count]));

  return (
    <div>
      <h2 className="mb-1 text-sm font-medium text-foreground">Subcategory distribution</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Expand each NCLEX category to see how questions are tagged underneath. High
        &ldquo;General&rdquo; share often means extraction hasn&apos;t applied granular subtopics yet.
        Drill links open Section mode with that subcategory pre-selected.
      </p>
      <div className="space-y-2">
        {NCLEX_CATEGORIES.map((category) => {
          const catTotal = categoryTotals[category] ?? 0;
          const subs = SUBCATEGORIES[category as NclexCategory] ?? ["General"];
          const subCounts = bySubcategory[category] ?? {};
          const generalCount = subCounts["General"] ?? 0;
          const generalPct = generalSharePct(catTotal, generalCount);
          const isOpen = expanded === category;
          const taggedSubs = subs.filter((s) => (subCounts[s] ?? 0) > 0).length;

          return (
            <div key={category} className="overflow-hidden rounded-xl border border-border bg-white">
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : category)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
              >
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                    isOpen && "rotate-180"
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{category}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatQuestionCount(catTotal)} in bank · {taggedSubs} subtopic
                    {taggedSubs === 1 ? "" : "s"} with questions
                    {catTotal > 0 && generalPct >= 70 && (
                      <span className="ml-1 text-amber-600">· {generalPct}% General</span>
                    )}
                  </p>
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-border px-4 pb-4 pt-2">
                  <div className="space-y-1.5">
                    {subs.map((sub) => {
                      const count = subCounts[sub] ?? 0;
                      const pct =
                        catTotal > 0 ? Math.round((count / catTotal) * 1000) / 10 : 0;
                      const disabled = count === 0;
                      return (
                        <div
                          key={sub}
                          className={cn(
                            "flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                            disabled ? "border-border opacity-50" : "border-border bg-slate-50/80"
                          )}
                        >
                          <span className="min-w-0 flex-1 text-foreground">{sub}</span>
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            {formatQuestionCount(count)}
                            {catTotal > 0 && count > 0 && ` (${pct}%)`}
                          </span>
                          {!disabled && (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-indigo" asChild>
                              <Link
                                href={`/quiz/config?mode=section&category=${encodeURIComponent(category)}&subcategories=${encodeURIComponent(sub)}`}
                              >
                                Drill
                                <ArrowRight className="h-3 w-3" />
                              </Link>
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
