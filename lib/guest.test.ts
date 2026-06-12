import { describe, expect, it } from "vitest";
import {
  GUEST_MAX_QUESTIONS,
  capGuestSession,
  getRemainingFreeQuestions,
  shouldShowFreemiumGate,
  type GuestPersistedState,
  type GuestSession,
} from "./guest";

function makeState(overrides: Partial<GuestPersistedState> = {}): GuestPersistedState {
  return {
    sessionsUsed: 0,
    totalQuestionsAnswered: 0,
    bannerDismissed: false,
    activeSession: null,
    ...overrides,
  };
}

function makeSession(questionCount: number): GuestSession {
  const questions = Array.from({ length: questionCount }, (_, i) => ({
    id: `q-${i}`,
    question: "Sample?",
    options: { A: "One", B: "Two" },
    correct_answer: "A",
    category: "Test",
    subcategory: null,
    difficulty: null,
    is_ngn: false,
    ngn_type: null,
    explanation: null,
  }));

  return {
    id: "session-1",
    mode: "review",
    categoryFilter: null,
    totalQuestions: questionCount,
    startedAt: new Date().toISOString(),
    questions,
    answers: {},
    correct: 0,
    durationSecs: 0,
  };
}

describe("guest freemium limits", () => {
  it("returns remaining free questions", () => {
    expect(getRemainingFreeQuestions(makeState())).toBe(GUEST_MAX_QUESTIONS);
    expect(getRemainingFreeQuestions(makeState({ totalQuestionsAnswered: 7 }))).toBe(3);
  });

  it("gates when quota exhausted", () => {
    expect(shouldShowFreemiumGate(makeState({ totalQuestionsAnswered: 10 }))).toBe(true);
    expect(shouldShowFreemiumGate(makeState({ sessionsUsed: 1 }))).toBe(true);
    expect(shouldShowFreemiumGate(makeState({ totalQuestionsAnswered: 3 }))).toBe(false);
  });

  it("caps session to remaining allowance", () => {
    const session = makeSession(25);
    const capped = capGuestSession(session, 4);
    expect(capped.totalQuestions).toBe(4);
    expect(capped.questions).toHaveLength(4);
  });
});
