"use client";

import { useState } from "react";
import { ArrowRight, Check, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CONFIDENCE_LABELS = [
  "Not at all",
  "Slightly",
  "Somewhat",
  "Confident",
  "Very confident",
];

type RationalePanelProps = {
  explanation: string | null;
  isCorrect: boolean;
  correctAnswer: string;
  options?: Record<string, string>;
  show: boolean;
  onConfidence?: (rating: number) => void;
  onNext?: () => void;
  isLast?: boolean;
  showAiUpsell?: boolean;
};

export function RationalePanel({
  explanation,
  isCorrect,
  correctAnswer,
  options,
  show,
  onConfidence,
  onNext,
  isLast,
  showAiUpsell,
}: RationalePanelProps) {
  const [confidence, setConfidence] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  if (!show) return null;

  const wrongOptions = options
    ? Object.entries(options).filter(
        ([letter]) => !correctAnswer.split(",").map((l) => l.trim().toUpperCase()).includes(letter.toUpperCase())
      )
    : [];

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex max-h-[40vh] flex-col border-t border-border bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.08)] animate-slide-up">
      <div className="overflow-y-auto px-6 py-5">
        <div
          className={cn(
            "mb-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium",
            isCorrect ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          )}
        >
          {isCorrect ? (
            <>
              <Check className="h-4 w-4" strokeWidth={2} />
              Correct!
            </>
          ) : (
            <>
              <X className="h-4 w-4" strokeWidth={2} />
              Incorrect — correct answer was {correctAnswer}
            </>
          )}
        </div>

        {explanation ? (
          <p className="text-sm leading-relaxed text-foreground">{explanation}</p>
        ) : showAiUpsell ? (
          <p className="text-sm text-muted-foreground">
            Sign up free to unlock AI-powered explanations for every question.
          </p>
        ) : null}

        {wrongOptions.length > 0 && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex w-full items-center justify-between text-sm font-medium text-foreground"
            >
              Why each option is wrong
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
              />
            </button>
            {expanded && (
              <div className="mt-3 space-y-2">
                {wrongOptions.map(([letter, text]) => (
                  <div key={letter} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className="font-medium text-foreground">{letter}.</span>{" "}
                    <span className="text-muted-foreground">{text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {onConfidence && confidence === null && (
          <div className="mt-5">
            <p className="mb-2 text-sm text-muted-foreground">How confident were you?</p>
            <div className="flex flex-wrap gap-2">
              {CONFIDENCE_LABELS.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setConfidence(i + 1);
                    onConfidence(i + 1);
                  }}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-indigo hover:bg-indigo-50 hover:text-indigo"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {onNext && (confidence !== null || !onConfidence) && (
        <div className="flex shrink-0 justify-end border-t border-border px-6 py-3">
          <Button onClick={onNext}>
            {isLast ? "Finish session" : "Next question"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
