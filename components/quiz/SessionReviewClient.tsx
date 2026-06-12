"use client";

import { useState } from "react";
import { Check, ChevronDown, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/utils";
import { getReadinessLevel } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ExplanationAudio } from "@/components/quiz/ExplanationAudio";
import { TutorChat } from "@/components/quiz/TutorChat";
import { QuestionFeedback } from "@/components/quiz/QuestionFeedback";

type ReviewQuestion = {
  id: string;
  index: number;
  question: string;
  options: Record<string, string>;
  correct_answer: string;
  explanation: string | null;
  category: string;
  answerGiven: string | null;
  isCorrect: boolean;
};

type SessionReviewClientProps = {
  sessionId: string;
  mode: string;
  correct: number;
  total: number;
  durationSecs: number | null;
  questions: ReviewQuestion[];
  premiumFeatures?: {
    aiTutorChat: boolean;
    ttsRationales: boolean;
  };
};

export function SessionReviewClient({
  sessionId,
  mode,
  correct,
  total,
  durationSecs,
  questions,
  premiumFeatures,
}: SessionReviewClientProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const scorePct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const isMock = mode === "mock_exam";
  const readiness = getReadinessLevel(scorePct);
  const readinessLabel =
    readiness === "Likely" ? "Likely Pass" : readiness === "Borderline" ? "Borderline" : "Needs Work";
  const passed = !isMock && scorePct >= 75;
  const missed = questions.filter((q) => !q.isCorrect);
  const topMissedCategory = missed.length
    ? missed.reduce<Record<string, number>>((acc, q) => {
        acc[q.category] = (acc[q.category] ?? 0) + 1;
        return acc;
      }, {})
    : {};
  const drillCategory = Object.entries(topMissedCategory).sort((a, b) => b[1] - a[1])[0]?.[0];

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="text-center">
        <p className="text-sm font-medium capitalize text-muted-foreground">
          {isMock ? "NCLEX mock exam" : `${mode.replace("_", " ")} session`}
        </p>
        <p className="mt-2 text-5xl font-semibold tabular-nums text-foreground">{scorePct}%</p>
        <p className="mt-1 text-muted-foreground">
          {correct} of {total} correct
          {durationSecs != null && durationSecs > 0 && <> · {formatDuration(durationSecs)}</>}
        </p>
        <div
          className={cn(
            "mx-auto mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
            isMock
              ? readiness === "Likely"
                ? "bg-emerald-50 text-emerald-700"
                : readiness === "Borderline"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-red-50 text-red-700"
              : passed
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
          )}
        >
          {isMock ? (
            <>
              {readiness === "Likely" ? (
                <Check className="h-4 w-4" strokeWidth={2} />
              ) : (
                <X className="h-4 w-4" strokeWidth={2} />
              )}
              Readiness: {readinessLabel}
            </>
          ) : passed ? (
            <>
              <Check className="h-4 w-4" strokeWidth={2} />
              {scorePct >= 85 ? "Excellent work" : "Good session. Keep going."}
            </>
          ) : (
            <>
              <X className="h-4 w-4" strokeWidth={2} />
              Review missed questions below
            </>
          )}
        </div>
        {isMock && (
          <p className="mt-3 text-xs text-muted-foreground">
            Mock exams use NCLEX category proportions. Practice readiness on your dashboard excludes
            mock scores.
          </p>
        )}
      </div>

      {missed.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 sm:flex-row">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {missed.length} missed question{missed.length === 1 ? "" : "s"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Retry what you got wrong or drill the weakest category from this session.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button size="sm" variant="outline" asChild>
              <Link
                href={`/quiz/config?mode=missed_review&count=${Math.min(missed.length, 25)}`}
              >
                <RotateCcw className="h-4 w-4" />
                Retry misses
              </Link>
            </Button>
            {drillCategory && (
              <Button size="sm" variant="outline" asChild>
                <Link
                  href={`/quiz/config?mode=section&category=${encodeURIComponent(drillCategory)}`}
                >
                  Drill {drillCategory.split(" ")[0]}
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Question breakdown</h2>
        {questions.map((q) => {
          const isOpen = expanded === q.id;
          return (
            <div
              key={q.id}
              className={cn(
                "overflow-hidden rounded-xl border bg-white transition-colors",
                q.isCorrect ? "border-border" : "border-red-200"
              )}
            >
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : q.id)}
                className="flex w-full items-start gap-3 p-4 text-left"
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                    q.isCorrect ? "bg-emerald-50 text-emerald" : "bg-red-50 text-red-500"
                  )}
                >
                  {q.index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm text-foreground">{q.question}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {q.category} · Your answer: {q.answerGiven ?? "None"}
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    "mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                    isOpen && "rotate-180"
                  )}
                />
              </button>
              {isOpen && (
                <div className="border-t border-border px-4 pb-4 pt-3 text-sm">
                  <p className="leading-relaxed text-foreground">{q.question}</p>
                  <div className="mt-3 space-y-1.5">
                    {Object.entries(q.options)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([letter, text]) => {
                        const isCorrectLetter = q.correct_answer
                          .split(",")
                          .map((l) => l.trim().toUpperCase())
                          .includes(letter.toUpperCase());
                        const isUserAnswer = q.answerGiven
                          ?.split(",")
                          .map((l) => l.trim().toUpperCase())
                          .includes(letter.toUpperCase());
                        return (
                          <div
                            key={letter}
                            className={cn(
                              "flex gap-2 rounded-lg px-3 py-2",
                              isCorrectLetter && "bg-emerald-50",
                              isUserAnswer && !isCorrectLetter && "bg-red-50"
                            )}
                          >
                            <span className="font-medium text-muted-foreground">{letter}.</span>
                            <span>{text}</span>
                          </div>
                        );
                      })}
                  </div>
                  {q.explanation && (
                    <>
                      <p className="mt-3 rounded-lg bg-slate-50 p-3 leading-relaxed text-muted-foreground">
                        {q.explanation}
                      </p>
                      <ExplanationAudio
                        questionId={q.id}
                        enabled={premiumFeatures?.ttsRationales ?? false}
                        hasExplanation
                      />
                    </>
                  )}
                  <div className="mt-4">
                    <TutorChat
                      sessionId={sessionId}
                      questionId={q.id}
                      enabled={premiumFeatures?.aiTutorChat ?? false}
                    />
                  </div>
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="mb-2 text-xs text-muted-foreground">Was this question helpful?</p>
                    <QuestionFeedback questionId={q.id} sessionId={sessionId} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" className="h-12 flex-1" asChild>
          <Link href="/home">Back to home</Link>
        </Button>
        <Button className="h-12 flex-1" asChild>
          <Link href="/quiz/config">
            New session
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
