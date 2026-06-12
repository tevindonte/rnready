"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { AnswerOption } from "@/components/quiz/AnswerOption";
import { RationalePanel } from "@/components/quiz/RationalePanel";
import { QuizSessionShell } from "@/components/quiz/QuizSessionShell";
import type { QuestionNavStatus } from "@/components/quiz/QuestionNavigator";
import { useQuizKeyboard } from "@/hooks/useQuizKeyboard";
import { normalizeAnswer } from "@/lib/utils";
import type { Question, QuizMode, Session } from "@/lib/constants";

type SessionQuestion = {
  question_id: string;
  order_index: number;
  questions: Question;
};

type QuizSessionClientProps = {
  session: Session;
  sessionQuestions: SessionQuestion[];
};

export function QuizSessionClient({ session, sessionQuestions }: QuizSessionClientProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [eliminated, setEliminated] = useState<string[]>([]);
  const [scratchPad, setScratchPad] = useState("");
  const [answered, setAnswered] = useState<
    Record<string, { given: string; correct: boolean; explanation: string | null }>
  >({});
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

  const current = sessionQuestions[currentIndex];
  const question = current?.questions;
  const isSata = question?.is_ngn && question?.ngn_type === "sata";
  const mode = session.mode as QuizMode;
  const totalCorrect = Object.values(answered).filter((a) => a.correct).length;

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

    const res = await fetch("/api/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: session.id,
        question_id: current.question_id,
        answer_given: answerGiven,
        time_secs: timeSecs,
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

    if (mode === "review") {
      setShowRationale(true);
    } else if (currentIndex >= sessionQuestions.length - 1) {
      await finishSession(data.isCorrect ? totalCorrect + 1 : totalCorrect);
    } else {
      setCurrentIndex((i) => i + 1);
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

  async function finishSession(correctCount?: number) {
    const finalCorrect = correctCount ?? totalCorrect;
    await fetch("/api/sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: session.id,
        correct: finalCorrect,
        duration_secs: elapsedSecs.current,
        ended_at: new Date().toISOString(),
      }),
    });
    router.push(`/quiz/${session.id}/review`);
  }

  async function advanceOrFinish() {
    if (currentIndex >= sessionQuestions.length - 1) {
      const correctCount = Object.values(answered).filter((a) => a.correct).length;
      await finishSession(correctCount);
    } else {
      setCurrentIndex((i) => i + 1);
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
    onNext: showRationale && mode === "review" ? () => advanceOrFinish() : undefined,
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
        getNavStatus={getNavStatus}
        onNavigate={(i) => {
          if (!showRationale) setCurrentIndex(i);
        }}
        flagged={flagged}
        currentQuestionId={current.question_id}
        onToggleFlag={toggleFlag}
        onEndSession={() => finishSession()}
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

        <div className="mx-auto mt-8 w-full max-w-[680px] space-y-3">
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
              <p className="text-center text-xs text-muted-foreground">
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
          onNext={mode === "review" ? advanceOrFinish : undefined}
          isLast={currentIndex >= sessionQuestions.length - 1}
        />
      )}
    </>
  );
}
