import { buildDistributionAudit } from "@/lib/nclex-distribution";
import { formatQuestionCount, type QuestionBankStats } from "@/lib/question-bank";
import { cn } from "@/lib/utils";

export function BankDistributionAudit({
  byCategory,
  sharedTotal,
  className,
}: {
  byCategory: QuestionBankStats["byCategory"];
  sharedTotal: number;
  className?: string;
}) {
  if (sharedTotal <= 0) return null;

  const rows = buildDistributionAudit(byCategory, sharedTotal);

  return (
    <div className={className}>
      <h2 className="mb-1 text-sm font-medium text-foreground">Bank vs NCLEX test plan</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        How your question bank compares to typical NCLEX category weights. Review and mock exams
        pull proportionally to NCLEX; ingesting more sources in thin categories improves variety.
      </p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border bg-slate-50 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">NCLEX target</th>
              <th className="px-4 py-3 font-medium">In bank</th>
              <th className="px-4 py-3 font-medium">Bank %</th>
              <th className="px-4 py-3 font-medium">Gap</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.category} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-foreground">{row.category}</td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground">
                  ~{row.nclexTargetPct.toFixed(0)}%
                </td>
                <td className="px-4 py-3 tabular-nums">{formatQuestionCount(row.bankCount)}</td>
                <td className="px-4 py-3 tabular-nums">{row.bankPct.toFixed(1)}%</td>
                <td
                  className={cn(
                    "px-4 py-3 tabular-nums font-medium",
                    row.gapPct > 5 && "text-amber-600",
                    row.gapPct < -5 && "text-indigo"
                  )}
                >
                  {row.gapPct > 0 ? "+" : ""}
                  {row.gapPct.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
