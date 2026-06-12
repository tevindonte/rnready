"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { AnswerOption } from "@/components/quiz/AnswerOption";
import { RationalePanel } from "@/components/quiz/RationalePanel";
import { QuizSessionShell } from "@/components/quiz/QuizSessionShell";
import type { QuestionNavStatus } from "@/components/quiz/QuestionNavigator";
import { useQuizKeyboard } from "@/hooks/useQuizKeyboard";
import { useQuizLeaveGuard } from "@/hooks/useQuizLeaveGuard";
import { normalizeAnswer } from "@/lib/utils";
import type { Question, QuizMode, Session } from "@/lib/constants";

type SessionQuestion = {
  question_id: string;
  order_index: number;
  questions: Question;
};

type InitialAnswer = {
  question_id: string;
  answer_given: string | null;
  is_correct: boolean | null;
};

type QuizSessionClientProps = {
  session: Session;
  sessionQuestions: SessionQuestion[];
  initialAnswers?: InitialAnswer[];
  initialIndex?: number;
};

function buildAnsweredMap(
  initialAnswers: InitialAnswer[],
  sessionQuestions: SessionQuestion[]
) {
  const questionMap = new Map(sessionQuestions.map((sq) => [sq.question_id, sq.questions]));
  const answered: Record<string, { given: string; correct: boolean; explanation: string | null }> =
    {};

  for (const row of initialAnswers) {
    if (!row.answer_given) continue;
    const q = questionMap.get(row.question_id);
    answered[row.question_id] = {
      given: row.answer_given,
      correct: row.is_correct ?? false,
      explanation: q?.explanation ?? null,
    };
  }
  return answered;
}

function resolveResumeIndex(
  session: Session,
  sessionQuestions: SessionQuestion[],
  initialAnswers: InitialAnswer[],
  initialIndex?: number
) {
  const saved = initialIndex ?? session.current_index ?? 0;
  const maxIndex = Math.max(0, sessionQuestions.length - 1);
  const clamped = Math.min(Math.max(0, saved), maxIndex);

  const answeredIds = new Set(
    initialAnswers.filter((a) => a.answer_given).map((a) => a.question_id)
  );
  const firstUnanswered = sessionQuestions.findIndex((sq) => !answeredIds.has(sq.question_id));
  if (firstUnanswered >= 0 && clamped < firstUnanswered) {
    return firstUnanswered;
  }
  return clamped;
}

export function QuizSessionClient({
  session,
  sessionQuestions,
  initialAnswers = [],
  initialIndex,
}: QuizSessionClientProps) {
  const router = useRouter();
  const resumeIndex = resolveResumeIndex(session, sessionQuestions, initialAnswers, initialIndex);
  const [currentIndex, setCurrentIndex] = useState(resumeIndex);
  const [selected, setSelected] = useState<string[]>([]);
  const [eliminated, setEliminated] = useState<string[]>([]);
  const [scratchPad, setScratchPad] = useState("");
  const [answered, setAnswered] = useState(() => buildAnsweredMap(initialAnswers, sessionQuestions));
  const [showRationale, setShowRationale] = useState(false);
  const [lastResult, setLastResult] = useState<{
    isCorrect: boolean;
    correctAnswer: string;
    explanation: string | null;
  } | null>(null);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const questionStart = useRef(Date.now());
  const elapsedSecs = useRef(0);
  const saveToolsTimer = useRef<NodeJS.Timeout>();

  const { showLeaveDialog, stay, leave } = useQuizLeaveGuard({
    enabled: session.status !== "completed" && !session.ended_at,
  });

  const current = sessionQuestions[currentIndex];
  const question = current?.questions;
  const isSata = question?.is_ngn && question?.ngn_type === "sata";
  const mode = session.mode as QuizMode;
  const answeredCount = Object.keys(answered).length;

  const saveProgress = useCallback(
    async (index: number) => {
      sessionStorage.setItem(`quiz-${session.id}-index`, String(index));
      await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: session.id,
          current_index: index,
          status: "in_progress",
        }),
      }).catch(() => {});
    },
    [session.id]
  );

  const saveTools = useCallback(
    (scratch: string, strike: string[], calcUsed?: boolean) => {
      if (!current) return;
      fetch("/api/answers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: session.id,
          question_id: current.question_id,
          scratch_pad: scratch,
          strikethrough: strike,
          calculator_used: calcUsed,
        }),
      }).catch(() => {});
    },
    [current, session.id]
  );

  useEffect(() => {
    saveProgress(resumeIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    questionStart.current = Date.now();
    setSelected([]);
    setEliminated([]);
    setScratchPad("");
    setShowRationale(false);
    setLastResult(null);
  }, [currentIndex]);

  useEffect(() => {
    clearTimeout(saveToolsTimer.current);
    saveToolsTimer.current = setTimeout(() => saveTools(scratchPad, eliminated), 500);
    return () => clearTimeout(saveToolsTimer.current);
  }, [scratchPad, eliminated, saveTools]);

  function getNavStatus(index: number): QuestionNavStatus {
    const sq = sessionQuestions[index];
    if (!sq) return "unanswered";
    if (flagged.has(sq.question_id) && !answered[sq.question_id]) return "flagged";
    const ans = answered[sq.question_id];
    if (!ans) return "unanswered";
    if (flagged.has(sq.question_id)) return "flagged";
    return ans.correct ? "correct" : "wrong";
  }

  function toggleFlag() {
    if (!current) return;
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(current.question_id)) next.delete(current.question_id);
      else next.add(current.question_id);
      return next;
    });
  }

  function toggleSelect(letter: string) {
    if (showRationale) return;
    if (isSata) {
      setSelected((prev) =>
        prev.includes(letter) ? prev.filter((l) => l !== letter) : [...prev, letter]
      );
    } else {
      setSelected([letter]);
    }
  }

  const optionLetters = useMemo(
    () =>
      question
        ? Object.keys(question.options).sort((a, b) => a.localeCompare(b))
        : [],
    [question]
  );

  function toggleEliminate(letter: string) {
    setEliminated((prev) =>
      prev.includes(letter) ? prev.filter((l) => l !== letter) : [...prev, letter]
    );
  }

  async function submitAnswer(forcedAnswer?: string) {
    if (!question || !current || submitting) return;
    const answerGiven = forcedAnswer ?? normalizeAnswer(selected.join(","));
    if (!answerGiven && !forcedAnswer) return;

    setSubmitting(true);
    const timeSecs = Math.round((Date.now() - questionStart.current) / 1000);
    const nextIndex =
      currentIndex >= sessionQuestions.length - 1 ? currentIndex : currentIndex + 1;

    const res = await fetch("/api/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: session.id,
        question_id: current.question_id,
        answer_given: answerGiven,
        time_secs: timeSecs,
        current_index: nextIndex,
      }),
    });

    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) return;

    setAnswered((prev) => ({
      ...prev,
      [current.question_id]: {
        given: answerGiven,
        correct: data.isCorrect,
        explanation: data.explanation,
      },
    }));

    setLastResult({
      isCorrect: data.isCorrect,
      correctAnswer: data.correctAnswer,
      explanation: data.explanation,
    });

    if (mode === "review" || mode === "custom") {
      setShowRationale(true);
    } else if (currentIndex >= sessionQuestions.length - 1) {
      await finishSession();
    } else {
      setCurrentIndex(nextIndex);
      saveProgress(nextIndex);
    }
  }

  async function submitConfidence(rating: number) {
    if (!current) return;
    await fetch("/api/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: session.id,
        question_id: current.question_id,
        answer_given: answered[current.question_id]?.given ?? normalizeAnswer(selected.join(",")),
        time_secs: Math.round((Date.now() - questionStart.current) / 1000),
        confidence: rating,
      }),
    });
  }

  async function pauseSession(redirectTo?: string) {
    await fetch("/api/sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: session.id,
        current_index: currentIndex,
        duration_secs: elapsedSecs.current,
        status: "paused",
      }),
    });
    if (redirectTo) router.push(redirectTo);
  }

  async function finishSession() {
    await fetch("/api/sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: session.id,
        duration_secs: elapsedSecs.current,
        ended_at: new Date().toISOString(),
        status: "completed",
      }),
    });
    router.push(`/quiz/${session.id}/review`);
  }

  async function advanceOrFinish() {
    if (currentIndex >= sessionQuestions.length - 1) {
      await finishSession();
    } else {
      const next = currentIndex + 1;
      setCurrentIndex(next);
      saveProgress(next);
    }
  }

  const handleSelect = useCallback(
    (letter: string) => toggleSelect(letter),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showRationale, isSata]
  );

  useQuizKeyboard({
    enabled: !!question,
    optionLetters,
    selected,
    showRationale,
    isSata: !!isSata,
    onSelect: handleSelect,
    onSubmit: () => submitAnswer(),
    onNext: showRationale && (mode === "review" || mode === "custom") ? () => advanceOrFinish() : undefined,
    canSubmit: selected.length > 0 && !submitting,
  });

  if (!question) {
    return <p className="p-8 text-muted-foreground">No questions in this session.</p>;
  }

  const correctLetters = question.correct_answer.split(",").map((l) => l.trim().toUpperCase());

  return (
    <>
      <QuizSessionShell
        mode={mode}
        currentIndex={currentIndex}
        totalQuestions={sessionQuestions.length}
        answeredCount={answeredCount}
        getNavStatus={getNavStatus}
        onNavigate={() => {}}
        forwardOnly
        flagged={flagged}
        currentQuestionId={current.question_id}
        onToggleFlag={toggleFlag}
        onSaveForLater={() => pauseSession("/home")}
        onFinishSession={() => finishSession()}
        onTimeUp={() => submitAnswer(selected.length ? undefined : "")}
        onTick={(s) => {
          elapsedSecs.current = s;
        }}
        scratchPad={scratchPad}
        onScratchPadChange={setScratchPad}
        onCalculatorOpen={() => saveTools(scratchPad, eliminated, true)}
        showRationale={showRationale}
      >
        <QuestionCard question={question} index={currentIndex} total={sessionQuestions.length} />

        <div className="mx-auto mt-8 w-full max-w-[680px] space-y-3 pb-20 lg:pb-0">
          {Object.entries(question.options)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([letter, text]) => (
              <AnswerOption
                key={letter}
                letter={letter}
                text={text}
                selected={selected.includes(letter)}
                eliminated={eliminated.includes(letter)}
                showResult={showRationale}
                isCorrect={correctLetters.includes(letter.toUpperCase())}
                isWrongSelection={
                  selected.includes(letter) && !correctLetters.includes(letter.toUpperCase())
                }
                multiSelect={!!isSata}
                onSelect={() => toggleSelect(letter)}
                onEliminate={() => toggleEliminate(letter)}
              />
            ))}

          {!showRationale && (
            <>
              <Button
                className="mt-4 h-12 w-full"
                disabled={selected.length === 0 || submitting}
                onClick={() => submitAnswer()}
              >
                Submit answer
              </Button>
              <p className="hidden text-center text-xs text-muted-foreground md:block">
                Tip: press 1–4 or A–D to select, Enter to submit
              </p>
            </>
          )}
        </div>
      </QuizSessionShell>

      {lastResult && (
        <RationalePanel
          explanation={lastResult.explanation}
          isCorrect={lastResult.isCorrect}
          correctAnswer={lastResult.correctAnswer}
          options={question.options}
          show={showRationale}
          onConfidence={mode === "review" ? submitConfidence : undefined}
          onNext={mode === "review" || mode === "custom" ? advanceOrFinish : undefined}
          isLast={currentIndex >= sessionQuestions.length - 1}
        />
      )}

      <ConfirmDialog
        open={showLeaveDialog}
        onOpenChange={(open) => {
          if (!open) stay();
        }}
        title="Save and leave?"
        description="Your progress will be saved for later. Paused sessions don't affect your analytics until you finish & review."
        confirmLabel="Save for later"
        cancelLabel="Stay"
        onConfirm={() => {
          void pauseSession().then(() => leave());
        }}
      />
    </>
  );
}
