"use client";

import {
  NCLEX_CATEGORIES,
  type NclexCategory,
} from "@/lib/constants";
import { SUBCATEGORIES } from "@/lib/subcategories";
import { formatQuestionCount } from "@/lib/question-bank";
import { cn } from "@/lib/utils";

type SectionCategoryPickerProps = {
  category: string | null;
  subcategories: string[];
  categoryCounts: Record<string, number>;
  subcategoryCounts: Record<string, Record<string, number>>;
  onCategoryChange: (category: string) => void;
  onSubcategoriesChange: (subcategories: string[]) => void;
};

export function getSectionAvailableCount(
  category: string | null,
  subcategories: string[],
  categoryCounts: Record<string, number>,
  subcategoryCounts: Record<string, Record<string, number>>
): number {
  if (!category) return 0;
  if (subcategories.length === 0) return categoryCounts[category] ?? 0;
  return subcategories.reduce(
    (sum, sub) => sum + (subcategoryCounts[category]?.[sub] ?? 0),
    0
  );
}

export function SectionCategoryPicker({
  category,
  subcategories,
  categoryCounts,
  subcategoryCounts,
  onCategoryChange,
  onSubcategoriesChange,
}: SectionCategoryPickerProps) {
  const available = getSectionAvailableCount(
    category,
    subcategories,
    categoryCounts,
    subcategoryCounts
  );

  function toggleSubcategory(sub: string) {
    onSubcategoriesChange(
      subcategories.includes(sub)
        ? subcategories.filter((s) => s !== sub)
        : [...subcategories, sub]
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-white p-4">
      <div>
        <p className="text-sm font-medium text-foreground">Choose a category</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Section mode drills one NCLEX category at a time.
        </p>
        <div className="mt-3 space-y-2">
          {NCLEX_CATEGORIES.map((cat) => {
            const count = categoryCounts[cat] ?? 0;
            const selected = category === cat;
            const disabled = count === 0;
            return (
              <label
                key={cat}
                className={cn(
                  "flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors",
                  disabled && "cursor-not-allowed opacity-50",
                  selected && !disabled && "border-indigo bg-indigo-50"
                )}
              >
                <input
                  type="radio"
                  name="section-category"
                  className="h-4 w-4"
                  checked={selected}
                  disabled={disabled}
                  onChange={() => !disabled && onCategoryChange(cat)}
                />
                <span className="flex-1 text-sm text-foreground">{cat}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {formatQuestionCount(count)}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {category && (
        <div>
          <p className="text-sm font-medium text-foreground">Subcategories (optional)</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Leave all unchecked to practice the full category. Select one or more to narrow your
            drill.
          </p>
          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
            {(SUBCATEGORIES[category as NclexCategory] ?? ["General"]).map((sub) => {
              const count = subcategoryCounts[category]?.[sub] ?? 0;
              const disabled = count === 0;
              const checked = subcategories.includes(sub);
              return (
                <label
                  key={sub}
                  className={cn(
                    "flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border px-3 py-2",
                    disabled && "cursor-not-allowed opacity-50",
                    checked && !disabled && "border-indigo bg-indigo-50"
                  )}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => !disabled && toggleSubcategory(sub)}
                  />
                  <span className="flex-1 text-sm">{sub}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {formatQuestionCount(count)}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {category && (
        <p className="text-xs text-muted-foreground">
          {available > 0
            ? `${formatQuestionCount(available)} question${available === 1 ? "" : "s"} available for this selection.`
            : "No questions match this selection yet."}
        </p>
      )}
    </div>
  );
}
