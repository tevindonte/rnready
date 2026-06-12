"use client";

import { QuestionTtsButton } from "@/components/quiz/QuestionTtsButton";

type ExplanationAudioProps = {
  questionId: string;
  enabled: boolean;
  hasExplanation: boolean;
};

export function ExplanationAudio({ questionId, enabled, hasExplanation }: ExplanationAudioProps) {
  if (!hasExplanation) return null;

  return (
    <QuestionTtsButton
      questionId={questionId}
      enabled={enabled}
      part="explanation"
      className="mt-2"
      upsellHint="Listen to explanations with"
    />
  );
}
