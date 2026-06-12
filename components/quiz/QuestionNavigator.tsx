"use client";

import { cn } from "@/lib/utils";

export type QuestionNavStatus = "unanswered" | "correct" | "wrong" | "flagged" | "current";

type QuestionNavigatorProps = {
  total: number;
  currentIndex: number;
  getStatus: (index: number) => QuestionNavStatus;
  onNavigate: (index: number) => void;
  vertical?: boolean;
  /** NCLEX-style: progress display only — no jumping to past or future questions */
  readOnly?: boolean;
};

export function QuestionNavigator({
  total,
  currentIndex,
  getStatus,
  onNavigate,
  vertical = true,
  readOnly = false,
}: QuestionNavigatorProps) {
  const items = Array.from({ length: total }, (_, i) => i);

  return (
    <div
      className={cn(
        vertical
          ? "flex flex-col items-center gap-2 py-2"
          : "flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 py-3 lg:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      )}
      role="list"
      aria-label={readOnly ? "Question progress" : "Question navigation"}
    >
      {items.map((index) => {
        const status = index === currentIndex ? "current" : getStatus(index);
        const isPast = index < currentIndex;
        const className = cn(
          "flex shrink-0 items-center justify-center rounded-full font-medium transition-all",
          vertical ? "h-8 w-8 text-xs" : "h-10 w-10 snap-center text-xs sm:h-11 sm:w-11 sm:text-sm",
          status === "unanswered" && "border border-slate-400 text-slate-400",
          status === "correct" && "bg-emerald text-white",
          status === "wrong" && "bg-red-500 text-white",
          status === "flagged" && "bg-amber-500 text-white",
          status === "current" &&
            cn(
              "bg-indigo text-white ring-2 ring-indigo/40 ring-offset-2",
              vertical ? "ring-offset-navy" : "ring-offset-white"
            ),
          readOnly && isPast && "opacity-70",
          readOnly && index > currentIndex && "opacity-40"
        );

        if (readOnly) {
          return (
            <div
              key={index}
              role="listitem"
              aria-label={`Question ${index + 1}${status === "current" ? ", current" : isPast ? ", completed" : ""}`}
              aria-current={status === "current" ? "step" : undefined}
              className={className}
            >
              {index + 1}
            </div>
          );
        }

        return (
          <button
            key={index}
            type="button"
            role="listitem"
            onClick={() => onNavigate(index)}
            className={className}
            aria-label={`Question ${index + 1}`}
            aria-current={status === "current" ? "step" : undefined}
          >
            {index + 1}
          </button>
        );
      })}
    </div>
  );
}
