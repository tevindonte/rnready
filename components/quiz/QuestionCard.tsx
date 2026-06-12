"use client";

import type { Question } from "@/lib/constants";

type QuestionCardProps = {
  question: Question;
  index: number;
  total: number;
};

export function QuestionCard({ question }: QuestionCardProps) {
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
      <p className="text-lg leading-relaxed text-foreground">{question.question}</p>
    </div>
  );
}
