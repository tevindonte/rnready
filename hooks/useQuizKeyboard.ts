"use client";

import { useEffect } from "react";

type UseQuizKeyboardOptions = {
  enabled: boolean;
  optionLetters: string[];
  selected: string[];
  showRationale: boolean;
  isSata: boolean;
  onSelect: (letter: string) => void;
  onSubmit: () => void;
  onNext?: () => void;
  canSubmit: boolean;
};

export function useQuizKeyboard({
  enabled,
  optionLetters,
  selected,
  showRationale,
  isSata,
  onSelect,
  onSubmit,
  onNext,
  canSubmit,
}: UseQuizKeyboardOptions) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      const key = e.key.toUpperCase();

      if (!showRationale) {
        const letterIndex = optionLetters.findIndex((l) => l.toUpperCase() === key);
        if (letterIndex >= 0) {
          e.preventDefault();
          onSelect(optionLetters[letterIndex]);
          return;
        }

        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= optionLetters.length) {
          e.preventDefault();
          onSelect(optionLetters[num - 1]);
          return;
        }

        if (e.key === "Enter" && canSubmit && selected.length > 0) {
          e.preventDefault();
          onSubmit();
        }
      } else if (e.key === "Enter" && onNext) {
        e.preventDefault();
        onNext();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    enabled,
    optionLetters,
    selected,
    showRationale,
    isSata,
    onSelect,
    onSubmit,
    onNext,
    canSubmit,
  ]);
}
