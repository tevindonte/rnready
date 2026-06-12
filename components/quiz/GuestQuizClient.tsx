"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { AnswerOption } from "@/components/quiz/AnswerOption";
import { RationalePanel } from "@/components/quiz/RationalePanel";
import { QuizSessionShell } from "@/components/quiz/QuizSessionShell";
import type { QuestionNavStatus } from "@/components/quiz/QuestionNavigator";
import { GuestResultsScreen } from "@/components/GuestResultsScreen";
import { useQuizKeyboard } from "@/hooks/useQuizKeyboard";
import { gradeAnswer, normalizeAnswer } from "@/lib/utils";
import type { Question } from "@/lib/constants";
import {
  capGuestSession,
  completeGuestSession,
  completeGuestSessionOnServer,
  getGuestState,
  getRemainingFreeQuestions,
  GUEST_MAX_QUESTIONS,
  recordGuestAnswer,
  recordGuestAnswerOnServer,
  saveGuestSession,
  shouldShowFreemiumGate,
  type GuestSession,
} from "@/lib/guest";
import { FreemiumGateModal } from "@/components/FreemiumGateModal";

export function GuestQuizClient() {
  const router = useRouter();
  const [session, setSession] = useState<GuestSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [eliminated, setEliminated] = useState<string[]>([]);
  const [scratchPad, setScratchPad] = useState("");
  const [showRationale, setShowRationale] = useState(false);
  const [lastResult, setLastResult] = useState<{
    isCorrect: boolean;
    correctAnswer: string;
    explanation: string | null;
  } | null>(null);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [showResults, setShowResults] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [resultsStats, setResultsStats] = useState({ correct: 0, total: 0 });
  const questionStart = useRef(Date.now());
  const elapsedSecs = useRef(0);

  useEffect(() => {
    const state = getGuestState();
    if (shouldShowFreemiumGate(state)) {
      setShowGate(true);
      return;
    }
    if (!state.activeSession) {
      router.replace("/quiz/config");
      return;
    }

    const answeredInSession = Object.keys(state.activeSession.answers).length;
    const remaining = getRemainingFreeQuestions(state);
    const capped = capGuestSession(state.activeSession, answeredInSession + remaining);
    if (capped.totalQuestions <= 0 || capped.questions.length === 0) {
      setShowGate(true);
      return;
    }
    if (capped.totalQuestions !== state.activeSession.totalQuestions) {
      saveGuestSession(capped);
    }
    setSession(capped);
  }, [router]);

  useEffect(() => {
    questionStart.current = Date.now();
    setSelected([]);
    setEliminated([]);
    setScratchPad("");
    setShowRationale(false);
    setLastResult(null);
  }, [currentIndex]);

  const currentQ = session?.questions[currentIndex];
  const question = currentQ as unknown as Question | undefined;
  const isSata = question?.is_ngn && question?.ngn_type === "sata";
  const answered = session?.answers ?? {};

  const optionLetters = useMemo(
    () =>
      question
        ? Object.keys(question.options).sort((a, b) => a.localeCompare(b))
        : [],
    [question]
  );

  const toggleSelect = useCallback(
    (letter: string) => {
      if (showRationale || !question) return;
      if (isSata) {
        setSelected((prev) =>
          prev.includes(letter) ? prev.filter((l) => l !== letter) : [...prev, letter]
        );
      } else {
        setSelected([letter]);
      }
    },
    [showRationale, question, isSata]
  );

  function finishGuestFlow(finalSession: GuestSession) {
    const correct = Object.values(finalSession.answers).filter((a) => a.correct).length;
    const total = Object.keys(finalSession.answers).length;
    completeGuestSession(finalSession.id);
    void completeGuestSessionOnServer();
    setResultsStats({ correct, total: total || finalSession.totalQuestions });
    setShowResults(true);
  }

  function submitAnswer() {
    if (!question || !currentQ || !session) return;
    const answerGiven = normalizeAnswer(selected.join(","));
    if (!answerGiven) return;

    const isCorrect = gradeAnswer(answerGiven, question.correct_answer);
    const timeSecs = Math.round((Date.now() - questionStart.current) / 1000);

    const nextState = recordGuestAnswer(session.id, currentQ.id, {
      given: answerGiven,
      correct: isCorrect,
      timeSecs,
      confidence: null,
    });

    const updatedSession = nextState.activeSession ?? {
      ...session,
      answers: {
        ...session.answers,
        [currentQ.id]: { given: answerGiven, correct: isCorrect, timeSecs, confidence: null },
      },
      correct: Object.values({
        ...session.answers,
        [currentQ.id]: { given: answerGiven, correct: isCorrect, timeSecs, confidence: null },
      }).filter((a) => a.correct).length,
    };

    setSession(updatedSession);
    saveGuestSession(updatedSession);
    void recordGuestAnswerOnServer(currentQ.id).then((status) => {
      if (status?.gated) finishGuestFlow(updatedSession);
    });

    setLastResult({
      isCorrect,
      correctAnswer: question.correct_answer,
      explanation: question.explanation,
    });
    setShowRationale(true);
  }

  function handleConfidence(rating: number) {
    if (!currentQ || !session) return;
    const existing = session.answers[currentQ.id];
    if (existing) {
      const updated = {
        ...session,
        answers: {
          ...session.answers,
          [currentQ.id]: { ...existing, confidence: rating },
        },
      };
      setSession(updated);
      saveGuestSession(updated);
    }
  }

  function advanceOrFinish() {
    if (!session) return;
    const state = getGuestState();
    const atLimit = state.totalQuestionsAnswered >= GUEST_MAX_QUESTIONS;
    const atEnd = currentIndex >= session.questions.length - 1;

    if (atLimit || atEnd || getRemainingFreeQuestions(state) <= 0) {
      finishGuestFlow(session);
      return;
    }

    setCurrentIndex((i) => i + 1);
  }

  function handleSaveForLater() {
    if (!session) return;
    saveGuestSession(session);
    router.push("/quiz/config");
  }

  function handleFinishSession() {
    if (!session) return;
    const answeredCount = Object.keys(session.answers).length;
    if (answeredCount === 0) {
      completeGuestSession(session.id);
      router.push("/quiz/config");
      return;
    }
    finishGuestFlow(session);
  }

  useQuizKeyboard({
    enabled: !!question && !showResults,
    optionLetters,
    selected,
    showRationale,
    isSata: !!isSata,
    onSelect: toggleSelect,
    onSubmit: submitAnswer,
    onNext: showRationale ? advanceOrFinish : undefined,
    canSubmit: selected.length > 0,
  });

  if (!session || !question || !currentQ) return null;

  function getNavStatus(index: number): QuestionNavStatus {
    const q = session!.questions[index];
    if (!q) return "unanswered";
    if (flagged.has(q.id) && !answered[q.id]) return "flagged";
    const ans = answered[q.id];
    if (!ans) return "unanswered";
    if (flagged.has(q.id)) return "flagged";
    return ans.correct ? "correct" : "wrong";
  }

  function toggleFlag() {
    if (!currentQ) return;
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(currentQ.id)) next.delete(currentQ.id);
      else next.add(currentQ.id);
      return next;
    });
  }

  const correctLetters = question.correct_answer.split(",").map((l) => l.trim().toUpperCase());

  return (
    <>
      <QuizSessionShell
        mode="review"
        currentIndex={currentIndex}
        totalQuestions={session.totalQuestions}
        answeredCount={Object.keys(session.answers).length}
        getNavStatus={getNavStatus}
        onNavigate={() => {}}
        forwardOnly
        flagged={flagged}
        currentQuestionId={currentQ.id}
        onToggleFlag={toggleFlag}
        onSaveForLater={handleSaveForLater}
        onFinishSession={handleFinishSession}
        onTick={(s) => {
          elapsedSecs.current = s;
        }}
        scratchPad={scratchPad}
        onScratchPadChange={setScratchPad}
        showRationale={showRationale}
      >
        <QuestionCard question={question} index={currentIndex} total={session.totalQuestions} />

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
                onEliminate={() =>
                  setEliminated((prev) =>
                    prev.includes(letter) ? prev.filter((l) => l !== letter) : [...prev, letter]
                  )
                }
              />
            ))}

          {!showRationale && (
            <>
              {isSata && selected.length > 0 && (
                <p className="text-center text-xs text-muted-foreground">
                  {selected.length} option{selected.length === 1 ? "" : "s"} selected
                </p>
              )}
              <Button
                className="mt-4 h-12 w-full"
                disabled={selected.length === 0}
                onClick={submitAnswer}
              >
                Submit answer
              </Button>
              <p className="hidden text-center text-xs text-muted-foreground lg:block">
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
          onConfidence={handleConfidence}
          onNext={advanceOrFinish}
          isLast={
            currentIndex >= session.questions.length - 1 ||
            getGuestState().totalQuestionsAnswered >= GUEST_MAX_QUESTIONS ||
            getRemainingFreeQuestions() <= 0
          }
          showAiUpsell={!lastResult.explanation}
        />
      )}

      {showResults && (
        <GuestResultsScreen
          correct={resultsStats.correct}
          total={resultsStats.total}
        />
      )}

      <FreemiumGateModal open={showGate} />
    </>
  );
}
