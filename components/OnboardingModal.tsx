"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, Calendar, Mail, Sparkles, Target } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { QuizMode } from "@/lib/constants";

type OnboardingModalProps = {
  needsOnboarding: boolean;
  initialExamDate?: string | null;
};

const MODES: { value: QuizMode; label: string; description: string }[] = [
  { value: "review", label: "Review", description: "Best for learning. Explanations after each answer." },
  { value: "timed", label: "Timed", description: "Simulate exam pressure with a 90-second timer" },
  { value: "section", label: "Section", description: "Focus on one NCLEX category at a time" },
];

export function OnboardingModal({ needsOnboarding, initialExamDate }: OnboardingModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [examDate, setExamDate] = useState(initialExamDate ?? "");
  const [selectedMode, setSelectedMode] = useState<QuizMode>("review");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (needsOnboarding) setOpen(true);
  }, [needsOnboarding]);

  async function completeOnboarding() {
    setSaving(true);
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ complete_onboarding: true }),
    });
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  async function saveExamDate() {
    if (!examDate) {
      setStep(1);
      return;
    }
    setSaving(true);
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exam_date: examDate }),
    });
    setSaving(false);
    setStep(1);
  }

  async function handleStart() {
    await completeOnboarding();
    router.push(`/quiz/config?mode=${selectedMode}&count=10`);
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-[440px] gap-0 overflow-hidden rounded-xl p-0 [&>button.absolute]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="border-b border-border bg-indigo-50 px-6 py-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="h-5 w-5 text-indigo" strokeWidth={1.5} />
              Welcome to RNReady
            </DialogTitle>
          </DialogHeader>
          <div className="mt-3 flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  i <= step ? "bg-indigo" : "bg-indigo/20"
                )}
              />
            ))}
          </div>
        </div>

        <div className="px-6 py-6">
          {step === 0 && (
            <>
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                <Calendar className="h-5 w-5 text-indigo" strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-semibold text-foreground">When is your NCLEX?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                We&apos;ll show a countdown on your dashboard. You can skip and set this later.
              </p>
              <div className="mt-4 space-y-2">
                <Label htmlFor="onboard-exam">Exam date</Label>
                <Input
                  id="onboard-exam"
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                />
              </div>
              <div className="mt-6 flex flex-col gap-2">
                <Button className="h-11" onClick={saveExamDate} disabled={saving}>
                  {saving ? "Saving..." : examDate ? "Continue" : "Skip for now"}
                </Button>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                <Target className="h-5 w-5 text-indigo" strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-semibold text-foreground">How do you want to practice?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                We recommend Review mode for your first session.
              </p>
              <div className="mt-4 space-y-2">
                {MODES.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setSelectedMode(m.value)}
                    className={cn(
                      "w-full rounded-xl border p-3 text-left transition-colors",
                      selectedMode === m.value
                        ? "border-2 border-indigo bg-indigo-50"
                        : "border-border hover:border-slate-300"
                    )}
                  >
                    <p className="text-sm font-semibold text-foreground">{m.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{m.description}</p>
                  </button>
                ))}
              </div>
              <div className="mt-6 flex gap-2">
                <Button variant="outline" className="h-11 flex-1" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button className="h-11 flex-1" onClick={() => setStep(2)}>
                  Continue
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                <BookOpen className="h-5 w-5 text-indigo" strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-semibold text-foreground">You&apos;re all set</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Start with 10 questions in {selectedMode} mode. Your progress saves automatically.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>· Instant feedback on every answer</li>
                <li>· AI explanations (included with your account)</li>
                <li>· Track readiness across all NCLEX categories</li>
              </ul>
              <div className="mt-6 flex flex-col gap-2">
                <Button className="h-11" onClick={handleStart} disabled={saving}>
                  {saving ? "Saving..." : "Start first session"}
                  {!saving && <ArrowRight className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  className="h-11"
                  onClick={completeOnboarding}
                  disabled={saving}
                >
                  Explore dashboard first
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function EmailConfirmationCard({ email }: { email: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-8 shadow-card">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50">
        <Mail className="h-6 w-6 text-indigo" strokeWidth={1.5} />
      </div>
      <h1 className="text-center text-xl font-semibold text-foreground">Check your email</h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        We sent a confirmation link to{" "}
        <span className="font-medium text-foreground">{email}</span>. Click the link to activate
        your account, then sign in.
      </p>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Didn&apos;t receive it? Check spam or wait a few minutes before trying again.
      </p>
    </div>
  );
}
