import type { CategoryScore } from "@/lib/adaptive";
import { cn } from "@/lib/utils";

type CategoryBarsProps = {
  scores: CategoryScore[];
};

function barColor(pct: number, count: number): string {
  if (count === 0) return "bg-muted";
  if (pct >= 75) return "bg-green-500";
  if (pct >= 65) return "bg-yellow-500";
  return "bg-red-500";
}

export function CategoryBars({ scores }: CategoryBarsProps) {
  const withData = scores.filter((s) => s.count > 0);

  if (withData.length === 0) {
    return <p className="text-sm text-muted-foreground">Answer questions to see category breakdown.</p>;
  }

  return (
    <div className="space-y-4">
      {scores.map((s) => (
        <div key={s.category}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="truncate pr-2">{s.category}</span>
            <span className="shrink-0 text-muted-foreground">
              {s.count > 0 ? `${s.pct}% (${s.count})` : "N/A"}
              {s.isWeak && s.count > 0 && (
                <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                  Weak
                </span>
              )}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full transition-all", barColor(s.pct, s.count))}
              style={{ width: s.count > 0 ? `${s.pct}%` : "0%" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
