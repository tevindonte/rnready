"use client";

import { useState } from "react";
import {
  Flag,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/LogoMark";
import { QuestionNavigator, type QuestionNavStatus } from "@/components/quiz/QuestionNavigator";
import { SessionProgressBar } from "@/components/quiz/ProgressBar";
import { ScratchPad } from "@/components/quiz/ScratchPad";
import { Calculator as CalculatorTool } from "@/components/quiz/Calculator";
import { LabValues } from "@/components/quiz/LabValues";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
}: QuizSessionShellProps) {
  const isFlagged = flagged.has(currentQuestionId);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);

  return (
    <>
    <div className="flex h-screen flex-col bg-background">
      <SessionProgressBar current={currentIndex + 1} total={totalQuestions} />

      <div className="flex flex-1 overflow-hidden pt-0.5">
        {/* Desktop left rail */}
        <aside className="hidden w-16 shrink-0 flex-col bg-navy md:flex">
          <div className="flex justify-center py-4">
            <LogoMark size="sm" />
          </div>
          <div className="flex-1 overflow-y-auto">
            <QuestionNavigator
              total={totalQuestions}
              currentIndex={currentIndex}
              getStatus={getNavStatus}
              onNavigate={onNavigate}
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
                "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                isFlagged ? "bg-amber-500 text-white" : "text-slate-400 hover:bg-white/10 hover:text-white"
              )}
              aria-label="Flag question"
            >
              <Flag className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </aside>

        {/* Main area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Mobile nav strip */}
          <div className="border-b border-border bg-white md:hidden">
            <QuestionNavigator
              total={totalQuestions}
              currentIndex={currentIndex}
              getStatus={getNavStatus}
              onNavigate={onNavigate}
              vertical={false}
            />
          </div>

          {/* Top bar */}
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-white px-4 md:px-6">
            <span className="text-sm font-medium text-foreground">
              Question {currentIndex + 1} of {totalQuestions}
            </span>
            <Timer mode={mode} onTimeUp={onTimeUp} onTick={onTick} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEndConfirmOpen(true)}
              className="text-muted-foreground"
            >
              End session
            </Button>
          </div>

          {/* Question content */}
          <div
            className={cn(
              "flex-1 overflow-y-auto bg-background px-4 py-8 md:px-8",
              showRationale && "pb-[42vh]"
            )}
          >
            {children}
          </div>

          {/* Mobile tools */}
          <div className="flex items-center justify-center gap-2 border-t border-border bg-white p-2 md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Menu className="h-4 w-4" />
                  Tools
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="rounded-l-xl">
                <SheetHeader>
                  <SheetTitle>Tools</SheetTitle>
                </SheetHeader>
                <div className="mt-4 flex flex-wrap gap-2">
                  <ScratchPad value={scratchPad} onChange={onScratchPadChange} />
                  <CalculatorTool onOpen={onCalculatorOpen} />
                  <LabValues />
                  <Button
                    variant={isFlagged ? "default" : "outline"}
                    size="sm"
                    onClick={onToggleFlag}
                  >
                    <Flag className="h-4 w-4" />
                    Flag
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
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
