"use client";

import { cn } from "@/lib/utils";

export type QuestionNavStatus = "unanswered" | "correct" | "wrong" | "flagged" | "current";

type QuestionNavigatorProps = {
  total: number;
  currentIndex: number;
  getStatus: (index: number) => QuestionNavStatus;
  onNavigate: (index: number) => void;
  vertical?: boolean;
};

export function QuestionNavigator({
  total,
  currentIndex,
  getStatus,
  onNavigate,
  vertical = true,
}: QuestionNavigatorProps) {
  const items = Array.from({ length: total }, (_, i) => i);

  return (
    <div
      className={cn(
        vertical
          ? "flex flex-col items-center gap-2 py-2"
          : "flex gap-2 overflow-x-auto px-4 py-2 md:hidden"
      )}
    >
      {items.map((index) => {
        const status = index === currentIndex ? "current" : getStatus(index);
        return (
          <button
            key={index}
            type="button"
            onClick={() => onNavigate(index)}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-all",
              status === "unanswered" && "border border-slate-400 text-slate-400",
              status === "correct" && "bg-emerald text-white",
              status === "wrong" && "bg-red-500 text-white",
              status === "flagged" && "bg-amber-500 text-white",
              status === "current" &&
                "bg-indigo text-white ring-2 ring-indigo/40 ring-offset-2 ring-offset-navy"
            )}
            aria-label={`Question ${index + 1}`}
          >
            {index + 1}
          </button>
        );
      })}
    </div>
  );
}
