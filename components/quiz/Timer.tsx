"use client";

import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils";
import type { QuizMode } from "@/lib/constants";
import { MOCK_EXAM_TIME_LIMIT_SECS } from "@/lib/constants";

type TimerProps = {
  mode: QuizMode;
  onTimeUp?: () => void;
  onTick?: (elapsed: number) => void;
};

const TIMED_SECONDS = 90;

export function Timer({ mode, onTimeUp, onTick }: TimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const [remaining, setRemaining] = useState(
    mode === "mock_exam" ? MOCK_EXAM_TIME_LIMIT_SECS : TIMED_SECONDS
  );
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      if (mode === "timed" || mode === "mock_exam") {
        setRemaining((r) => {
          if (mode === "timed" && r <= 1) {
            onTimeUp?.();
            return 0;
          }
          return r > 0 ? r - 1 : 0;
        });
      }
      setElapsed((e) => {
        const next = e + 1;
        onTick?.(next);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [paused, mode, onTimeUp, onTick]);

  const display =
    mode === "timed" || mode === "mock_exam" ? formatDuration(remaining) : formatDuration(elapsed);
  const urgent = mode === "timed" && remaining <= 15;
  const mockLowTime = mode === "mock_exam" && remaining <= 15 * 60;

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`font-mono text-sm tabular-nums ${
          urgent || mockLowTime ? "font-medium text-red-500" : "text-muted-foreground"
        }`}
      >
        {display}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground"
        onClick={() => setPaused(!paused)}
      >
        {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}
