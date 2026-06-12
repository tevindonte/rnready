import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { OnboardingModal } from "@/components/OnboardingModal";
import { LocalDateTime } from "@/components/LocalDateTime";
import { LocalGreeting } from "@/components/LocalGreeting";
import { computeReadinessScore } from "@/lib/adaptive";
import { computeStudyStreak } from "@/lib/streak";
import { attachSessionScores } from "@/lib/session-score";
import { getSessionDisplayName } from "@/lib/session-display";
import { AlertTriangle, ArrowRight, BarChart3, BookOpen, Calendar, Flame, Play } from "lucide-react";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";

function formatMode(mode: string): string {
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, exam_date, onboarding_completed_at")
    .eq("id", user.id)
    .single();

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data: weekSessions } = await supabase
    .from("sessions")
    .select("ended_at")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .not("ended_at", "is", null)
    .gte("ended_at", weekAgo.toISOString());

  const { data: allCompletedSessions } = await supabase
    .from("sessions")
    .select("ended_at")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .not("ended_at", "is", null);

  const { data: recentSessionsRaw } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .not("ended_at", "is", null)
    .order("ended_at", { ascending: false })
    .limit(3);

  const recentSessions = await attachSessionScores(supabase, recentSessionsRaw ?? []);

  const { data: pausedSessions } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["in_progress", "paused"])
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(5);

  const { count: questionsAnswered } = await supabase
    .from("session_answers")
    .select("*, sessions!inner(status)", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("sessions.status", "completed");

  const { weightedScore, level, categoryScores } = await computeReadinessScore(user.id);

  const name = profile?.name || user.email?.split("@")[0] || "Student";
  const sessionsThisWeek = weekSessions?.length ?? 0;
  const questionsAnsweredCount = questionsAnswered ?? 0;
  const hasSessions = recentSessions.length > 0;
  const studyStreak = computeStudyStreak(
    (allCompletedSessions ?? []).map((s) => s.ended_at)
  );

  const avgScore =
    recentSessions.length > 0
      ? Math.round(
          recentSessions.reduce((sum, s) => sum + s.percent, 0) / recentSessions.length
        )
      : 0;

  const examDays = profile?.exam_date
    ? Math.ceil(
        (new Date(profile.exam_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null;

  const weakAreas = categoryScores.filter((s) => s.isWeak).slice(0, 2);
  const readinessLabel =
    level === "Likely" ? "Likely Pass" : level === "Borderline" ? "Borderline" : "Needs Work";

  return (
    <div className="space-y-8">
      <OnboardingModal
        needsOnboarding={!profile?.onboarding_completed_at}
        initialExamDate={profile?.exam_date}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <LocalGreeting name={name} />
          {examDays !== null && examDays > 0 && (
            <p className="mt-1 text-muted-foreground">
              Exam in{" "}
              <span className="font-medium text-foreground">{examDays} days</span>
            </p>
          )}
          {examDays === null && (
            <p className="mt-1 text-muted-foreground">
              Ready to study? Start a session and track your progress.
            </p>
          )}
        </div>
        {examDays !== null && examDays > 0 && (
          <div className="text-right">
            <p className="text-4xl font-semibold tabular-nums text-foreground">{examDays}</p>
            <p className="text-xs text-muted-foreground">days until exam</p>
          </div>
        )}
      </div>

      {pausedSessions && pausedSessions.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Saved sessions</h2>
          {pausedSessions.map((session) => (
            <Card key={session.id} className="border-indigo-200 bg-indigo-50/40">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="flex items-start gap-3">
                  <Play className="mt-0.5 h-5 w-5 shrink-0 text-indigo" strokeWidth={1.5} />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {getSessionDisplayName(session)}
                    </p>
                    <p className="mt-0.5 text-sm capitalize text-muted-foreground">
                      {formatMode(session.mode)} · Question{" "}
                      {(session.current_index ?? 0) + 1} of {session.total_questions ?? "?"}
                    </p>
                  </div>
                </div>
                <Button asChild>
                  <Link href={`/quiz/${session.id}`}>
                    Resume
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!profile?.exam_date && hasSessions && (
        <Card className="border-indigo-200 bg-indigo-50/40">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-indigo" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-medium text-foreground">Set your exam date</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Get a personalized countdown on your dashboard
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings">Add exam date</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {questionsAnsweredCount > 0 && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <p className="text-sm text-muted-foreground">NCLEX readiness</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-foreground">
                {weightedScore}%
              </p>
              <p
                className={cn(
                  "mt-0.5 text-sm font-medium",
                  level === "Likely" && "text-emerald",
                  level === "Borderline" && "text-amber-500",
                  level === "Unlikely" && "text-red-500"
                )}
              >
                {readinessLabel}
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/analytics">
                View mastery map
                <BarChart3 className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Sessions this week", value: sessionsThisWeek },
          { label: "Avg score", value: hasSessions ? `${avgScore}%` : "N/A" },
          { label: "Questions answered", value: questionsAnsweredCount },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {studyStreak > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Flame className="h-4 w-4 text-amber-500" strokeWidth={1.5} />
          <span>
            <span className="font-medium text-foreground">
              {studyStreak} day{studyStreak === 1 ? "" : "s"} streak
            </span>
            . Keep it going.
          </span>
        </div>
      )}

      {weakAreas.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-medium text-foreground">Your weak areas</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {weakAreas.map((w) => `${w.category} (${w.pct}%)`).join(" · ")}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/quiz/config?mode=adaptive">
                Drill weak areas
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {hasSessions ? (
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Recent sessions</h2>
          <div className="space-y-2">
            {recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-white p-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {getSessionDisplayName(session)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        <LocalDateTime value={session.ended_at!} />
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {session.correct}/{session.total} correct ({session.percent}%)
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/quiz/${session.id}/review`}>Review</Link>
                  </Button>
                </div>
              ))}
          </div>
        </div>
      ) : (
        !pausedSessions?.length && (
          <EmptyState
            icon={BookOpen}
            title="No sessions yet"
            description="Complete your first practice session to see scores, weak areas, and readiness tracking here."
            actionLabel="Start your first session"
            actionHref="/quiz/config"
          />
        )
      )}

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <p className="font-medium text-foreground">Start a new session</p>
            <p className="text-sm text-muted-foreground">Configure your mode and question count</p>
          </div>
          <Button asChild>
            <Link href="/quiz/config">
              Start new session
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
