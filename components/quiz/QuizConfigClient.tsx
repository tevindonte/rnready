"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BookOpen, BookOpenCheck, Clock, Layers, Target } from "lucide-react";
import {
  NCLEX_CATEGORIES,
  NCLEX_CATEGORY_SHORT,
  QUIZ_MODES,
  type NclexCategory,
  type QuizMode,
} from "@/lib/constants";
import { SUBCATEGORIES } from "@/lib/subcategories";
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
  syncGuestWithServer,
  applyServerGuestStatus,
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
  const [sectionCategory, setSectionCategory] = useState<string | null>(null);
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [subcategoryCounts, setSubcategoryCounts] = useState<
    Record<string, Record<string, number>>
  >({});
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
        if (data.bySubcategory) setSubcategoryCounts(data.bySubcategory);
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
        setSectionCategory(paramCategory);
        setMode("section");
      }

      if (guest) {
        setCountPreset(GUEST_MAX_QUESTIONS);
        const serverStatus = await syncGuestWithServer();
        const remaining = serverStatus?.remaining ?? getRemainingFreeQuestions();
        setRemainingFree(remaining);
        if (serverStatus?.gated || shouldShowFreemiumGate()) setShowGate(true);
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

  function selectSectionCategory(cat: string) {
    setSectionCategory(cat);
    const counts = subcategoryCounts[cat] ?? {};
    const subs = SUBCATEGORIES[cat as NclexCategory] ?? ["General"];
    const available = subs.filter((s) => (counts[s] ?? 0) > 0);
    setSubcategories(available.length > 0 ? available : ["General"]);
  }

  function toggleSubcategory(sub: string) {
    setSubcategories((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
  }

  async function startAuthenticatedSession(questionCount: number) {
    if (mode === "section" && !sectionCategory) {
      setError("Select a category");
      setLoading(false);
      return;
    }
    if (mode === "section" && subcategories.length === 0) {
      setError("Select at least one subcategory");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        category_filter: mode === "section" ? sectionCategory : null,
        subcategory_filter: mode === "section" ? subcategories : null,
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
      mode === "section" && sectionCategory ? sectionCategory : null;
    const res = await fetch(
      `/api/guest/questions?count=${remaining}${
        categoryParam ? `&category=${encodeURIComponent(categoryParam)}` : ""
      }`
    );
    const data = await res.json();
    if (res.status === 403) {
      applyServerGuestStatus(data);
      setShowGate(true);
      setLoading(false);
      return;
    }
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
      <div className="mx-auto min-h-screen w-full max-w-[640px] px-4 py-8 sm:max-w-xl sm:px-6 md:max-w-2xl md:py-12 lg:max-w-[640px]">
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
                      "flex min-h-[120px] flex-col rounded-xl border p-4 text-left transition-all sm:min-h-[132px]",
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

          {!isGuest && (
            <Link
              href="/study-guide"
              className="flex items-center gap-4 rounded-xl border border-border bg-white p-4 transition-colors hover:border-indigo hover:bg-indigo-50/50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50">
                <BookOpenCheck className="h-5 w-5 text-violet-600" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Custom study guide</p>
                <p className="text-xs text-muted-foreground">
                  Paste your notes and generate a personalized quiz
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          )}

          {mode === "section" && (
            <div className="space-y-4">
              <div>
                <p className="mb-3 text-sm font-medium text-foreground">Category</p>
                <div className="flex flex-wrap gap-2">
                  {NCLEX_CATEGORIES.map((cat) => {
                    const selected = sectionCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        title={cat}
                        onClick={() => selectSectionCategory(cat)}
                        className={cn(
                          "min-h-[44px] rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
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

              {sectionCategory && (
                <div>
                  <p className="mb-3 text-sm font-medium text-foreground">Subcategories</p>
                  <div className="space-y-2">
                    {(SUBCATEGORIES[sectionCategory as NclexCategory] ?? ["General"]).map(
                      (sub) => {
                        const count = subcategoryCounts[sectionCategory]?.[sub] ?? 0;
                        const disabled = count === 0;
                        const checked = subcategories.includes(sub);
                        return (
                          <label
                            key={sub}
                            className={cn(
                              "flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border px-3 py-2",
                              disabled && "cursor-not-allowed opacity-50",
                              checked && !disabled && "border-indigo bg-indigo-50"
                            )}
                          >
                            <input
                              type="checkbox"
                              className="h-5 w-5 rounded"
                              checked={checked}
                              disabled={disabled}
                              onChange={() => !disabled && toggleSubcategory(sub)}
                            />
                            <span className="flex-1 text-sm">{sub}</span>
                            <span className="text-xs text-muted-foreground">[{count}]</span>
                          </label>
                        );
                      }
                    )}
                  </div>
                </div>
              )}
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
              (mode === "section" && (!sectionCategory || subcategories.length === 0)) ||
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
