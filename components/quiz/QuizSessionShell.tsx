"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/LogoMark";
import { QuestionNavigator, type QuestionNavStatus } from "@/components/quiz/QuestionNavigator";
import { SessionProgressBar } from "@/components/quiz/ProgressBar";
import { ScratchPad } from "@/components/quiz/ScratchPad";
import { Calculator as CalculatorTool } from "@/components/quiz/Calculator";
import { LabValues } from "@/components/quiz/LabValues";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Timer } from "@/components/quiz/Timer";
import type { QuizMode } from "@/lib/constants";

type QuizSessionShellProps = {
  mode: QuizMode;
  currentIndex: number;
  totalQuestions: number;
  getNavStatus: (index: number) => QuestionNavStatus;
  onNavigate: (index: number) => void;
  flagged: Set<string>;
  currentQuestionId: string;
  onToggleFlag: () => void;
  onEndSession: () => void;
  onTimeUp?: () => void;
  onTick?: (secs: number) => void;
  scratchPad: string;
  onScratchPadChange: (v: string) => void;
  onCalculatorOpen?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showRationale?: boolean;
  /** NCLEX-style forward-only: no back/skip via navigator (default true) */
  forwardOnly?: boolean;
};

export function QuizSessionShell({
  mode,
  currentIndex,
  totalQuestions,
  getNavStatus,
  onNavigate,
  flagged,
  currentQuestionId,
  onToggleFlag,
  onEndSession,
  onTimeUp,
  onTick,
  scratchPad,
  onScratchPadChange,
  onCalculatorOpen,
  children,
  footer,
  showRationale,
  forwardOnly = true,
}: QuizSessionShellProps) {
  const isFlagged = flagged.has(currentQuestionId);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const navReadOnly = forwardOnly || showRationale;

  return (
    <>
      <div className="flex h-[100dvh] flex-col bg-background">
        <SessionProgressBar current={currentIndex + 1} total={totalQuestions} />

        <div className="flex flex-1 overflow-hidden pt-0.5">
          {/* Desktop sidebar — lg+ only; tablet uses bottom toolbar like phone */}
          <aside className="hidden w-16 shrink-0 flex-col bg-navy lg:flex">
            <div className="flex justify-center py-4">
              <LogoMark size="sm" />
            </div>
            <div className="flex-1 overflow-y-auto">
              <QuestionNavigator
                total={totalQuestions}
                currentIndex={currentIndex}
                getStatus={getNavStatus}
                onNavigate={onNavigate}
                readOnly={navReadOnly}
              />
            </div>
            <div className="flex flex-col items-center gap-2 border-t border-white/10 py-3">
              <ScratchPad value={scratchPad} onChange={onScratchPadChange} iconOnly />
              <CalculatorTool onOpen={onCalculatorOpen} iconOnly />
              <LabValues iconOnly />
              <button
                type="button"
                onClick={onToggleFlag}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-lg transition-colors",
                  isFlagged ? "bg-amber-500 text-white" : "text-slate-400 hover:bg-white/10 hover:text-white"
                )}
                aria-label="Flag question"
              >
                <Flag className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>
          </aside>

          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Mobile + tablet progress strip */}
            <div className="shrink-0 border-b border-border bg-white lg:hidden">
              <QuestionNavigator
                total={totalQuestions}
                currentIndex={currentIndex}
                getStatus={getNavStatus}
                onNavigate={onNavigate}
                vertical={false}
                readOnly={navReadOnly}
              />
            </div>

            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-white px-4 sm:px-6">
              <span className="text-sm font-medium text-foreground">
                Q {currentIndex + 1}/{totalQuestions}
              </span>
              <Timer mode={mode} onTimeUp={onTimeUp} onTick={onTick} />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEndConfirmOpen(true)}
                className="min-h-[44px] min-w-[44px] text-muted-foreground"
              >
                End
              </Button>
            </div>

            <div
              className={cn(
                "flex-1 overflow-y-auto overflow-x-hidden bg-background px-4 py-6 sm:px-6 md:px-8 md:py-8",
                showRationale && "pb-[42vh]",
                "pb-24 lg:pb-8"
              )}
            >
              {children}
            </div>

            {/* Mobile + tablet tool bar */}
            <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-white px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
              <ScratchPad value={scratchPad} onChange={onScratchPadChange} iconOnly mobileBar />
              <CalculatorTool onOpen={onCalculatorOpen} iconOnly mobileBar />
              <LabValues iconOnly mobileBar />
              <button
                type="button"
                onClick={onToggleFlag}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-lg transition-colors",
                  isFlagged ? "bg-amber-500 text-white" : "text-slate-500 hover:bg-slate-100"
                )}
                aria-label="Flag question"
              >
                <Flag className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            {footer}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={endConfirmOpen}
        onOpenChange={setEndConfirmOpen}
        title="End this session?"
        description="Your progress will be saved. You can review your answers on the session summary."
        confirmLabel="End session"
        cancelLabel="Keep going"
        destructive
        onConfirm={onEndSession}
      />
    </>
  );
}
