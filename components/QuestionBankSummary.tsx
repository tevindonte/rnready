import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatQuestionCount, type QuestionBankStats } from "@/lib/question-bank";
import { cn } from "@/lib/utils";

type QuestionBankSummaryProps = {
  sharedTotal: number;
  customTotal?: number;
  variant?: "card" | "inline";
  className?: string;
};

export function QuestionBankSummary({
  sharedTotal,
  customTotal = 0,
  variant = "card",
  className,
}: QuestionBankSummaryProps) {
  const label =
    customTotal > 0
      ? `${formatQuestionCount(sharedTotal)} shared · ${formatQuestionCount(customTotal)} custom`
      : `${formatQuestionCount(sharedTotal)} NCLEX-style questions`;

  if (variant === "inline") {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        Question bank: <span className="font-medium text-foreground">{label}</span>
      </p>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="flex items-start gap-4 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
          <BookOpen className="h-5 w-5 text-indigo" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Question bank</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {formatQuestionCount(sharedTotal)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {customTotal > 0
              ? `${formatQuestionCount(customTotal)} custom questions from your study guides · shared NCLEX bank above`
              : "Shared NCLEX-style practice questions across all categories"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function QuestionBankCategoryGrid({
  byCategory,
  className,
}: {
  byCategory: QuestionBankStats["byCategory"];
  className?: string;
}) {
  const withQuestions = byCategory.filter((c) => c.count > 0);
  if (withQuestions.length === 0) return null;

  return (
    <div className={className}>
      <h2 className="mb-3 text-sm font-medium text-muted-foreground">Questions by category</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {byCategory.map((c) => (
          <div
            key={c.category}
            className="rounded-xl border border-border bg-white px-4 py-3"
          >
            <p className="truncate text-sm font-medium text-foreground">{c.category}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
              {formatQuestionCount(c.count)}
            </p>
            <p className="text-xs text-muted-foreground">in bank</p>
            {c.count > 0 && (
              <Button variant="ghost" size="sm" className="mt-2 h-8 px-0 text-indigo" asChild>
                <Link href={`/quiz/config?mode=section&category=${encodeURIComponent(c.category)}`}>
                  Drill this category
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
