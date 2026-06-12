"use client";

import { cn } from "@/lib/utils";

type AnswerOptionProps = {
  letter: string;
  text: string;
  selected: boolean;
  eliminated: boolean;
  showResult?: boolean;
  isCorrect?: boolean;
  isWrongSelection?: boolean;
  multiSelect: boolean;
  onSelect: () => void;
  onEliminate: () => void;
};

export function AnswerOption({
  letter,
  text,
  selected,
  eliminated,
  showResult,
  isCorrect,
  isWrongSelection,
  multiSelect,
  onSelect,
  onEliminate,
}: AnswerOptionProps) {
  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    if (!showResult) onEliminate();
  }

  function handleTouchStart() {
    const timer = setTimeout(onEliminate, 500);
    const clear = () => clearTimeout(timer);
    document.addEventListener("touchend", clear, { once: true });
    document.addEventListener("touchmove", clear, { once: true });
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      disabled={showResult}
      className={cn(
        "flex min-h-[56px] w-full items-start gap-4 rounded-xl border bg-white p-4 text-left transition-all",
        eliminated && "border-border bg-slate-50 line-through opacity-60",
        !eliminated && !showResult && selected && "border-indigo bg-indigo-50",
        !eliminated && !showResult && !selected && "border-border hover:border-indigo",
        showResult && isCorrect && "border-emerald bg-emerald-50",
        showResult && isWrongSelection && "border-red-500 bg-red-50"
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium",
          !showResult && !selected && "bg-slate-100 text-slate-500",
          !showResult && selected && "bg-indigo text-white",
          showResult && isCorrect && "bg-emerald text-white",
          showResult && isWrongSelection && "bg-red-500 text-white",
          eliminated && "bg-slate-200 text-slate-400"
        )}
      >
        {multiSelect && selected && !showResult ? "✓" : letter}
      </span>
      <span className="flex-1 pt-1 text-[15px] leading-relaxed text-foreground">{text}</span>
    </button>
  );
}
