"use client";

import { useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/utils";
import { getReadinessLevel } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
};

export function SessionReviewClient({
  mode,
  correct,
  total,
  durationSecs,
  questions,
}: SessionReviewClientProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const scorePct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const isMock = mode === "mock_exam";
  const readiness = getReadinessLevel(scorePct);
  const readinessLabel =
    readiness === "Likely" ? "Likely Pass" : readiness === "Borderline" ? "Borderline" : "Needs Work";
  const passed = !isMock && scorePct >= 75;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="text-center">
        <p className="text-sm font-medium capitalize text-muted-foreground">
          {isMock ? "NCLEX mock exam" : `${mode} session`}
        </p>
        <p className="mt-2 text-5xl font-semibold tabular-nums text-foreground">{scorePct}%</p>
        <p className="mt-1 text-muted-foreground">
          {correct} of {total} correct
          {durationSecs != null && durationSecs > 0 && (
            <> · {formatDuration(durationSecs)}</>
          )}
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
            Mock exams use NCLEX category proportions and the same readiness labels as your dashboard.
            The real NCLEX uses adaptive scoring, not a fixed pass percentage.
          </p>
        )}
      </div>

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
                    <p className="mt-3 rounded-lg bg-slate-50 p-3 leading-relaxed text-muted-foreground">
                      {q.explanation}
                    </p>
                  )}
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
