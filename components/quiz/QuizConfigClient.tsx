"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BookOpen, Clock, Layers, Target } from "lucide-react";
import {
  NCLEX_CATEGORIES,
  NCLEX_CATEGORY_SHORT,
  QUIZ_MODES,
  type NclexCategory,
  type QuizMode,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  canStartGuestSession,
  GUEST_MAX_QUESTIONS,
  getRemainingFreeQuestions,
  hasActiveGuestSession,
  shouldShowFreemiumGate,
  startGuestSession,
  type GuestSession,
} from "@/lib/guest";
import { FreemiumGateModal } from "@/components/FreemiumGateModal";
import { LogoMark } from "@/components/LogoMark";
import { QuestionBankSummary } from "@/components/QuestionBankSummary";

const MODE_ICONS = {
  clock: Clock,
  "book-open": BookOpen,
  layers: Layers,
  target: Target,
};

export function QuizConfigClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<QuizMode>("review");
  const [categories, setCategories] = useState<string[]>([]);
  const [countPreset, setCountPreset] = useState<number | "custom">(10);
  const [customCount, setCustomCount] = useState(15);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isGuest, setIsGuest] = useState(true);
  const [showGate, setShowGate] = useState(false);
  const [remainingFree, setRemainingFree] = useState(GUEST_MAX_QUESTIONS);
  const [bankTotal, setBankTotal] = useState<number | null>(null);

  useEffect(() => {
    router.prefetch("/quiz/guest");
  }, [router]);

  useEffect(() => {
    fetch("/api/questions/stats")
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.sharedTotal === "number") setBankTotal(data.sharedTotal);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      const guest = !user;
      setIsGuest(guest);

      const paramMode = searchParams.get("mode") as QuizMode | null;
      const paramCategory = searchParams.get("category");

      if (paramMode && QUIZ_MODES.some((m) => m.value === paramMode)) {
        setMode(paramMode);
      }
      if (paramCategory && NCLEX_CATEGORIES.includes(paramCategory as NclexCategory)) {
        setCategories([paramCategory]);
        setMode("section");
      }

      if (guest) {
        setCountPreset(GUEST_MAX_QUESTIONS);
        const remaining = getRemainingFreeQuestions();
        setRemainingFree(remaining);
        if (shouldShowFreemiumGate()) setShowGate(true);
        else if (hasActiveGuestSession()) router.replace("/quiz/guest");
      } else {
        const paramCount = searchParams.get("count");
        if (paramCount) {
          const n = parseInt(paramCount, 10);
          if ([10, 25, 50].includes(n)) setCountPreset(n);
          else if (n > 0) {
            setCountPreset("custom");
            setCustomCount(n);
          }
        } else {
          setCountPreset(25);
        }
      }

      setAuthReady(true);
    }
    init();
  }, [searchParams, router]);

  const count =
    isGuest
      ? Math.min(GUEST_MAX_QUESTIONS, remainingFree)
      : countPreset === "custom"
        ? Math.min(Math.max(customCount, 1), 100)
        : countPreset;

  function toggleCategory(cat: string) {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  async function startAuthenticatedSession(questionCount: number) {
    if (mode === "section" && categories.length === 0) {
      setError("Select at least one category");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        category_filter: mode === "section" ? categories[0] : null,
        total_questions: questionCount,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create session");
    router.push(`/quiz/${data.sessionId}`);
  }

  async function startGuestFlow() {
    if (shouldShowFreemiumGate() || !canStartGuestSession()) {
      setShowGate(true);
      setLoading(false);
      return;
    }

    if (hasActiveGuestSession()) {
      router.replace("/quiz/guest");
      return;
    }

    const remaining = getRemainingFreeQuestions();
    if (remaining <= 0) {
      setShowGate(true);
      setLoading(false);
      return;
    }

    const categoryParam =
      mode === "section" && categories.length === 1 ? categories[0] : null;
    const res = await fetch(
      `/api/guest/questions?count=${remaining}${
        categoryParam ? `&category=${encodeURIComponent(categoryParam)}` : ""
      }`
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load questions");

    const guestMode: GuestSession["mode"] =
      mode === "timed" ? "timed" : mode === "section" ? "section" : "review";

    const session: GuestSession = {
      id: crypto.randomUUID(),
      mode: guestMode,
      categoryFilter: categoryParam,
      totalQuestions: Math.min(data.questions.length, remaining),
      startedAt: new Date().toISOString(),
      questions: data.questions.slice(0, remaining),
      answers: {},
      correct: 0,
      durationSecs: 0,
    };

    const started = startGuestSession(session);
    if (!started) {
      setShowGate(true);
      setLoading(false);
      return;
    }

    router.replace("/quiz/guest");
  }

  async function handleStart() {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await startAuthenticatedSession(count);
        return;
      }

      await startGuestFlow();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  if (!authReady) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[640px] items-center justify-center px-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto min-h-screen max-w-[640px] px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <Link href={isGuest ? "/" : "/home"} className="flex items-center gap-2">
            <LogoMark size="sm" />
            <span className="text-sm font-medium text-muted-foreground">RNReady</span>
          </Link>
          {isGuest && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Configure session</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose how you want to practice today
          </p>
          {bankTotal !== null && bankTotal > 0 && (
            <QuestionBankSummary sharedTotal={bankTotal} variant="inline" className="mt-2" />
          )}
        </div>

        <div className="space-y-8">
          <div>
            <p className="mb-3 text-sm font-medium text-foreground">Study mode</p>
            <div className="grid grid-cols-2 gap-3">
              {QUIZ_MODES.filter((m) => !isGuest || !m.requiresAuth).map((m) => {
                const Icon = MODE_ICONS[m.icon];
                const selected = mode === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMode(m.value)}
                    className={cn(
                      "flex min-h-[120px] flex-col rounded-xl border p-4 text-left transition-all",
                      selected
                        ? "border-2 border-indigo bg-indigo-50"
                        : "border-border bg-white hover:border-slate-300"
                    )}
                  >
                    <Icon
                      className={cn("h-7 w-7", selected ? "text-indigo" : "text-slate-400")}
                      strokeWidth={1.5}
                    />
                    <p className="mt-3 text-base font-semibold text-foreground">{m.label}</p>
                    <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
                      {m.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {mode === "section" && (
            <div>
              <p className="mb-3 text-sm font-medium text-foreground">Categories</p>
              <div className="flex flex-wrap gap-2">
                {NCLEX_CATEGORIES.map((cat) => {
                  const selected = categories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      title={cat}
                      onClick={() => toggleCategory(cat)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                        selected
                          ? "border-indigo bg-indigo-50 text-indigo"
                          : "border-border bg-white text-muted-foreground hover:border-slate-300"
                      )}
                    >
                      {NCLEX_CATEGORY_SHORT[cat]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <p className="mb-3 text-sm font-medium text-foreground">Question count</p>
            {isGuest ? (
              <>
                <div className="inline-flex rounded-lg border border-border bg-white p-1">
                  <span className="rounded-md bg-indigo px-4 py-2 text-sm font-medium text-white">
                    {Math.min(GUEST_MAX_QUESTIONS, remainingFree)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Free trial: {remainingFree} question{remainingFree === 1 ? "" : "s"} remaining.
                  Sign up for unlimited access.
                </p>
              </>
            ) : (
              <>
                <div className="inline-flex rounded-lg border border-border bg-white p-1">
                  {[10, 25, 50].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCountPreset(n)}
                      className={cn(
                        "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                        countPreset === n
                          ? "bg-indigo text-white"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCountPreset("custom")}
                    className={cn(
                      "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                      countPreset === "custom"
                        ? "bg-indigo text-white"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Custom
                  </button>
                </div>
                {countPreset === "custom" && (
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={customCount}
                    onChange={(e) => setCustomCount(parseInt(e.target.value, 10) || 1)}
                    className="mt-3 w-32"
                  />
                )}
              </>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button
            size="lg"
            className="h-12 w-full"
            disabled={
              loading ||
              (mode === "section" && categories.length === 0) ||
              (isGuest && (shouldShowFreemiumGate() || remainingFree <= 0))
            }
            onClick={handleStart}
          >
            {loading ? "Starting..." : isGuest && hasActiveGuestSession() ? "Resume session" : "Start session"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <FreemiumGateModal open={showGate} />
    </>
  );
}
