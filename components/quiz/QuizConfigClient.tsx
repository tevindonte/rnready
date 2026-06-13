"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BookOpen, BookOpenCheck, Clock, GraduationCap, Layers, Target } from "lucide-react";
import {
  NCLEX_CATEGORIES,
  QUIZ_MODES,
  MOCK_EXAM_MIN_PRACTICE_ANSWERS,
  MOCK_EXAM_QUESTION_COUNT,
  MOCK_EXAM_TIME_LIMIT_SECS,
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
  syncGuestWithServer,
  applyServerGuestStatus,
  type GuestSession,
} from "@/lib/guest";
import { FreemiumGateModal } from "@/components/FreemiumGateModal";
import { QuestionBankSummary } from "@/components/QuestionBankSummary";
import {
  getSectionAvailableCount,
  SectionCategoryPicker,
} from "@/components/quiz/SectionCategoryPicker";
import { getMockOverlapWarnings } from "@/lib/mock-overlap";

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
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [countPreset, setCountPreset] = useState<number | "custom">(10);
  const [customCount, setCustomCount] = useState(15);
  const [timedShowRationale, setTimedShowRationale] = useState(false);
  const [missedCount, setMissedCount] = useState(0);
  const [mockOverlapWarnings, setMockOverlapWarnings] = useState<
    ReturnType<typeof getMockOverlapWarnings>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isGuest, setIsGuest] = useState(true);
  const [showGate, setShowGate] = useState(false);
  const [remainingFree, setRemainingFree] = useState(GUEST_MAX_QUESTIONS);
  const [bankTotal, setBankTotal] = useState<number | null>(null);
  const [sessionTitle, setSessionTitle] = useState("");
  const [practiceAnswerCount, setPracticeAnswerCount] = useState(0);

  useEffect(() => {
    router.prefetch("/quiz/guest");
  }, [router]);

  useEffect(() => {
    fetch("/api/questions/stats")
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.sharedTotal === "number") setBankTotal(data.sharedTotal);
        if (data.bySubcategory) setSubcategoryCounts(data.bySubcategory);
        if (Array.isArray(data.byCategory)) {
          setCategoryCounts(
            Object.fromEntries(data.byCategory.map((row: { category: string; count: number }) => [row.category, row.count]))
          );
          setMockOverlapWarnings(getMockOverlapWarnings(data.byCategory));
        }
        if (typeof data.missedCount === "number") setMissedCount(data.missedCount);
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
      const paramSubcategories = searchParams.get("subcategories");

      if (paramMode && QUIZ_MODES.some((m) => m.value === paramMode)) {
        setMode(paramMode);
      }
      const paramCount = searchParams.get("count");
      if (paramCount && !guest) {
        const n = parseInt(paramCount, 10);
        if ([10, 25, 50].includes(n)) setCountPreset(n);
        else if (n > 0) {
          setCountPreset("custom");
          setCustomCount(n);
        }
      }
      if (paramCategory && NCLEX_CATEGORIES.includes(paramCategory as NclexCategory)) {
        setSectionCategory(paramCategory);
        setMode("section");
      }
      if (paramSubcategories) {
        setSubcategories(
          paramSubcategories
            .split(",")
            .map((s) => decodeURIComponent(s.trim()))
            .filter(Boolean)
        );
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

        const { count } = await supabase
          .from("session_answers")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user!.id);
        setPracticeAnswerCount(count ?? 0);
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

  const sectionAvailable = getSectionAvailableCount(
    sectionCategory,
    subcategories,
    categoryCounts,
    subcategoryCounts
  );

  function selectSectionCategory(cat: string) {
    setSectionCategory(cat);
    setSubcategories([]);
  }

  async function startAuthenticatedSession(questionCount: number) {
    if (mode === "section" && !sectionCategory) {
      setError("Select a category for Section mode");
      setLoading(false);
      return;
    }
    if (mode === "section" && sectionAvailable === 0) {
      setError("No questions available for this category selection");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        category_filter: mode === "section" ? sectionCategory : null,
        subcategory_filter:
          mode === "section" && subcategories.length > 0 ? subcategories : null,
        total_questions: questionCount,
        title: sessionTitle.trim() || null,
        timed_show_rationale: mode === "timed" ? timedShowRationale : false,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create session");
    if (
      typeof data.questionCount === "number" &&
      typeof data.requestedCount === "number" &&
      data.questionCount < data.requestedCount
    ) {
      setError(
        `Only ${data.questionCount} questions were available (you requested ${data.requestedCount}). Starting with what we have.`
      );
    }
    router.push(`/quiz/${data.sessionId}`);
  }

  async function startGuestFlow() {
    if (mode === "section" && !sectionCategory) {
      setError("Select a category for Section mode");
      setLoading(false);
      return;
    }
    if (mode === "section" && sectionAvailable === 0) {
      setError("No questions available for this category selection");
      setLoading(false);
      return;
    }

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
    const subParams =
      mode === "section" && subcategories.length > 0
        ? `&subcategories=${subcategories.map(encodeURIComponent).join(",")}`
        : "";
    const res = await fetch(
      `/api/guest/questions?count=${remaining}${
        categoryParam ? `&category=${encodeURIComponent(categoryParam)}` : ""
      }${subParams}`
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

  async function startMockExam() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "mock_exam",
          total_questions: MOCK_EXAM_QUESTION_COUNT,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create mock exam");
      router.push(`/quiz/${data.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
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
      <div className="mx-auto flex max-w-2xl items-center justify-center py-24">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  }

  const modeMeta = QUIZ_MODES.find((m) => m.value === mode);
  const startLabel =
    loading
      ? "Starting..."
      : isGuest && hasActiveGuestSession()
        ? "Resume quiz"
        : mode === "mock_exam"
          ? "Start mock exam"
          : "Start quiz";

  return (
    <>
      <div className="mx-auto w-full max-w-2xl pb-8">
        <div className="mb-8">
          <p className="text-xs font-medium uppercase tracking-wide text-indigo">Step 1 of 2</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">Configure your quiz</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pick a mode and question count here.{" "}
            <span className="font-medium text-foreground">
              Step 2 is the actual test
            </span>{" "}
            — full-screen questions, navigation, scratch pad, and timer (if timed).
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
                    onClick={() => {
                      setMode(m.value);
                      if (m.value !== "section") {
                        setSectionCategory(null);
                        setSubcategories([]);
                      }
                    }}
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
            <SectionCategoryPicker
              category={sectionCategory}
              subcategories={subcategories}
              categoryCounts={categoryCounts}
              subcategoryCounts={subcategoryCounts}
              onCategoryChange={selectSectionCategory}
              onSubcategoriesChange={setSubcategories}
            />
          )}

          {!isGuest && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                  <GraduationCap className="h-5 w-5 text-indigo" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">NCLEX mock exam</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {MOCK_EXAM_QUESTION_COUNT} questions, NCLEX category weights,{" "}
                    {Math.floor(MOCK_EXAM_TIME_LIMIT_SECS / 3600)}-hour soft timer. Full exam
                    simulation — rationales only at the end.
                  </p>
                  {mockOverlapWarnings.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {mockOverlapWarnings.slice(0, 2).map((w) => (
                        <p
                          key={w.category}
                          className={cn(
                            "text-xs",
                            w.overlapRisk === "high" ? "text-amber-700" : "text-muted-foreground"
                          )}
                        >
                          {w.message}
                        </p>
                      ))}
                    </div>
                  )}
                  {practiceAnswerCount < MOCK_EXAM_MIN_PRACTICE_ANSWERS ? (
                    <p className="mt-2 text-xs text-amber-600">
                      Answer {MOCK_EXAM_MIN_PRACTICE_ANSWERS - practiceAnswerCount} more practice
                      questions to unlock ({practiceAnswerCount}/{MOCK_EXAM_MIN_PRACTICE_ANSWERS}).
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Separate readiness score from daily practice at the end.
                    </p>
                  )}
                  <Button
                    className="mt-4"
                    variant="outline"
                    disabled={loading || practiceAnswerCount < MOCK_EXAM_MIN_PRACTICE_ANSWERS}
                    onClick={() => void startMockExam()}
                  >
                    {loading ? "Starting..." : "Start mock exam"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!isGuest && (
            <div>
              <p className="mb-3 text-sm font-medium text-foreground">Session name (optional)</p>
              <Input
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                placeholder="e.g. Pharmacology review"
                maxLength={80}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Helps you find paused sessions on your dashboard
              </p>
            </div>
          )}

          {!isGuest && mode === "timed" && (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-white p-4">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={timedShowRationale}
                onChange={(e) => setTimedShowRationale(e.target.checked)}
              />
              <div>
                <p className="text-sm font-medium text-foreground">Show rationale after each answer</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Optional. Real NCLEX hides explanations until the end; leave unchecked for exam
                  simulation.
                </p>
              </div>
            </label>
          )}

          {!isGuest && mode === "missed_review" && (
            <p className="text-sm text-muted-foreground">
              {missedCount > 0
                ? `${missedCount} missed question${missedCount === 1 ? "" : "s"} in your history. We'll pull up to ${count}.`
                : "Complete a session first to build your missed-question queue."}
            </p>
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
                <div className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-white p-1">
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
                {mode === "section" && sectionCategory && sectionAvailable > 0 && count > sectionAvailable && (
                  <p className="mt-2 text-xs text-amber-600">
                    Only {sectionAvailable} question{sectionAvailable === 1 ? "" : "s"} available
                    for this selection. We will start with up to {sectionAvailable}.
                  </p>
                )}
              </>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="rounded-xl border-2 border-indigo bg-indigo-50/30 p-5">
            <p className="text-sm font-medium text-foreground">Step 2 — Start the quiz</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {modeMeta
                ? `${count} question${count === 1 ? "" : "s"} in ${modeMeta.label} mode. Opens full-screen with answer cards, question navigator, and tools.`
                : "Opens full-screen questions when you're ready."}
            </p>
            <Button
              size="lg"
              className="mt-4 h-12 w-full"
              disabled={
                loading ||
                (mode === "section" && (!sectionCategory || sectionAvailable === 0)) ||
                (mode === "missed_review" && missedCount === 0) ||
                (isGuest && (shouldShowFreemiumGate() || remainingFree <= 0))
              }
              onClick={handleStart}
            >
              {startLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {isGuest && (
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-indigo hover:underline">
                Sign in
              </Link>{" "}
              for adaptive mode, mock exams, and analytics.
            </p>
          )}
        </div>
      </div>

      <FreemiumGateModal open={showGate} />
    </>
  );
}
