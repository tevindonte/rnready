import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeReadinessScore, computeMockExamReadiness, getAvgTimeByCategory } from "@/lib/adaptive";
import { getQuestionBankStats } from "@/lib/question-bank";
import { attachSessionScores } from "@/lib/session-score";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { QuestionBankCategoryGrid, QuestionBankSummary } from "@/components/QuestionBankSummary";
import { BankDistributionAudit } from "@/components/analytics/BankDistributionAudit";
import { SubcategoryBankBreakdown } from "@/components/analytics/SubcategoryBankBreakdown";
import { ScoreChart } from "@/components/analytics/ScoreChart";
import { SessionHistory } from "@/components/analytics/SessionHistory";
import { MasteryHexagon } from "@/components/analytics/MasteryHexagon";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, GraduationCap } from "lucide-react";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/utils";

function barColor(pct: number, count: number): string {
  if (count === 0) return "bg-slate-200";
  if (pct >= 75) return "bg-emerald";
  if (pct >= 65) return "bg-amber-500";
  return "bg-red-500";
}

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const questionBank = await getQuestionBankStats(createAdminClient(), supabase);

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .not("ended_at", "is", null)
    .order("ended_at", { ascending: false });

  const completedSessions = await attachSessionScores(supabase, sessions ?? []);
  const practiceSessions = completedSessions.filter((s) => s.mode !== "mock_exam");
  const hasData = completedSessions.length > 0;

  const scoreChartData = practiceSessions
    .slice()
    .reverse()
    .map((s) => ({
      at: s.ended_at!,
      score: s.percent,
    }));

  const { weightedScore, level, categoryScores } = await computeReadinessScore(user.id, {
    excludeMockExam: true,
  });
  const mockReadiness = await computeMockExamReadiness(user.id);
  const avgTimeByCategory = await getAvgTimeByCategory(user.id, {
    excludeModes: ["mock_exam"],
  });

  const readinessLabel =
    level === "Likely" ? "Likely Pass" : level === "Borderline" ? "Borderline" : "Needs Work";
  const mockReadinessLabel =
    mockReadiness.level === "Likely"
      ? "Likely Pass"
      : mockReadiness.level === "Borderline"
        ? "Borderline"
        : "Needs Work";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Practice readiness excludes mock exams. Mock performance is tracked separately below.
        </p>
      </div>

      <QuestionBankSummary
        sharedTotal={questionBank.sharedTotal}
        customTotal={questionBank.customTotal}
      />

      {!hasData ? (
        <EmptyState
          icon={BarChart3}
          title="No analytics yet"
          description="Complete a practice session to unlock your mastery map, score trends, and category breakdown."
          actionLabel="Start a session"
          actionHref="/quiz/config"
        />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 text-sm font-medium text-muted-foreground">
                  Practice readiness (excludes mocks)
                </h2>
                <MasteryHexagon scores={categoryScores} weightedScore={weightedScore} />
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Readiness:{" "}
                  <span
                    className={cn(
                      "font-medium",
                      level === "Likely" && "text-emerald",
                      level === "Borderline" && "text-amber-500",
                      level === "Unlikely" && "text-red-500"
                    )}
                  >
                    {readinessLabel}
                  </span>
                </p>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-indigo" />
                    <h2 className="text-sm font-medium text-muted-foreground">Mock exam performance</h2>
                  </div>
                  {mockReadiness.sessionCount === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No completed mock exams yet.{" "}
                      <Link href="/quiz/config" className="text-indigo hover:underline">
                        Start one
                      </Link>
                    </p>
                  ) : (
                    <>
                      <p className="text-3xl font-semibold tabular-nums">
                        {mockReadiness.weightedScore}%
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {mockReadinessLabel} · {mockReadiness.sessionCount} mock
                        {mockReadiness.sessionCount === 1 ? "" : "s"} completed
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h2 className="mb-4 text-sm font-medium text-muted-foreground">Score trend</h2>
                  <ScoreChart data={scoreChartData} />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h2 className="mb-4 text-sm font-medium text-muted-foreground">Session history</h2>
                  <SessionHistory sessions={completedSessions} />
                </CardContent>
              </Card>
            </div>
          </div>

          <div>
            <h2 className="mb-4 text-sm font-medium text-muted-foreground">Category breakdown</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {categoryScores.map((s) => (
                <Card key={s.category}>
                  <CardContent className="p-4">
                    <p className="truncate text-sm font-medium text-foreground">{s.category}</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">
                      {s.count > 0 ? `${s.pct}%` : "N/A"}
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={cn("h-full transition-all", barColor(s.pct, s.count))}
                        style={{ width: s.count > 0 ? `${s.pct}%` : "0%" }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{s.count} questions answered</p>
                    {avgTimeByCategory.find((t) => t.category === s.category) && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Avg{" "}
                        {formatDuration(
                          avgTimeByCategory.find((t) => t.category === s.category)!.avgSecs
                        )}{" "}
                        per question
                      </p>
                    )}
                    <Button variant="ghost" size="sm" className="mt-2 h-8 px-0 text-indigo" asChild>
                      <Link
                        href={`/quiz/config?mode=section&category=${encodeURIComponent(s.category)}`}
                      >
                        Start section drill
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}

      <QuestionBankCategoryGrid byCategory={questionBank.byCategory} />

      <BankDistributionAudit
        byCategory={questionBank.byCategory}
        sharedTotal={questionBank.sharedTotal}
      />

      {questionBank.bySubcategory && questionBank.sharedTotal > 0 && (
        <SubcategoryBankBreakdown
          byCategory={questionBank.byCategory}
          bySubcategory={questionBank.bySubcategory}
        />
      )}
    </div>
  );
}
