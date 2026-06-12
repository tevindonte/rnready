"use client";

import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type GuestResultsScreenProps = {
  correct: number;
  total: number;
};

export function GuestResultsScreen({ correct, total }: GuestResultsScreenProps) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const passed = pct >= 75;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-white p-8 shadow-card">
        <p className="text-center text-sm font-medium text-muted-foreground">Session complete</p>
        <p className="mt-2 text-center text-5xl font-semibold tabular-nums text-foreground">
          {pct}%
        </p>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          {correct} of {total} correct
        </p>

        <div
          className={cn(
            "mt-6 flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium",
            passed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          )}
        >
          {passed ? (
            <>
              <Check className="h-4 w-4" strokeWidth={2} />
              Strong start. Keep practicing.
            </>
          ) : (
            <>
              <X className="h-4 w-4" strokeWidth={2} />
              Review rationales and drill weak areas
            </>
          )}
        </div>

        <p className="mt-6 text-center text-sm leading-relaxed text-muted-foreground">
          Sign up free to unlock unlimited questions, AI explanations, and track your readiness
          over time.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Button className="h-12 w-full" asChild>
            <Link href="/signup">
              Sign up free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" className="h-12 w-full" asChild>
            <Link href="/login">Already have an account? Sign in</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
