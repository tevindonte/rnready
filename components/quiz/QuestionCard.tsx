"use client";

import type { Question } from "@/lib/constants";
import { QuestionFeedback } from "@/components/quiz/QuestionFeedback";
import { QuestionTtsButton } from "@/components/quiz/QuestionTtsButton";

type QuestionCardProps = {
  question: Question;
  index: number;
  total: number;
  ttsEnabled?: boolean;
  sessionId?: string;
  showFeedback?: boolean;
};

export function QuestionCard({
  question,
  ttsEnabled = false,
  sessionId,
  showFeedback = false,
}: QuestionCardProps) {
  const isSata = question.is_ngn && question.ngn_type === "sata";

  return (
    <div className="mx-auto w-full max-w-[680px]">
      <p className="mb-3 text-xs text-muted-foreground">{question.category}</p>
      {isSata && (
        <span className="mb-4 inline-flex rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-600 ring-1 ring-amber-200">
          Select all that apply
        </span>
      )}
      {question.content_origin === "generated" && (
        <span className="mb-4 ml-2 inline-flex rounded-md bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 ring-1 ring-violet-200">
          AI-generated from notes
        </span>
      )}
      <div className="flex items-start gap-2">
        <p className="flex-1 text-lg leading-relaxed text-foreground">{question.question}</p>
        <div className="flex shrink-0 items-center gap-0.5">
          {question.question.trim() && (
            <QuestionTtsButton
              questionId={question.id}
              enabled={ttsEnabled}
              part="question"
              compact
              upsellHint="Listen to questions with"
            />
          )}
        </div>
      </div>
      {showFeedback && (
        <div className="mt-2">
          <QuestionFeedback questionId={question.id} sessionId={sessionId} />
        </div>
      )}
    </div>
  );
}
