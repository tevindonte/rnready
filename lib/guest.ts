export const GUEST_MAX_QUESTIONS = 10;
export const GUEST_MAX_SESSIONS = 1;
export const GUEST_STORAGE_KEY = "rnready_guest";
export const GUEST_PROGRESS_EVENT = "rnready:guest-progress";

function notifyGuestProgress() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(GUEST_PROGRESS_EVENT));
  }
}

export type GuestPersistedState = {
  sessionsUsed: number;
  /** Lifetime answered count — never reset when starting a session */
  totalQuestionsAnswered: number;
  bannerDismissed: boolean;
  activeSession: GuestSession | null;
};

export type GuestSession = {
  id: string;
  mode: "review" | "timed" | "section";
  categoryFilter: string | null;
  totalQuestions: number;
  startedAt: string;
  questions: GuestQuestion[];
  answers: Record<string, GuestAnswer>;
  correct: number;
  durationSecs: number;
};

export type GuestQuestion = {
  id: string;
  question: string;
  options: Record<string, string>;
  correct_answer: string;
  category: string;
  subcategory: string | null;
  difficulty: string | null;
  is_ngn: boolean;
  ngn_type: string | null;
  explanation: string | null;
};

export type GuestAnswer = {
  given: string;
  correct: boolean;
  timeSecs: number;
  confidence: number | null;
};

const DEFAULT_STATE: GuestPersistedState = {
  sessionsUsed: 0,
  totalQuestionsAnswered: 0,
  bannerDismissed: false,
  activeSession: null,
};

function normalizeState(raw: Partial<GuestPersistedState> & { questionsAnsweredInSession?: number }): GuestPersistedState {
  return {
    ...DEFAULT_STATE,
    ...raw,
    totalQuestionsAnswered:
      raw.totalQuestionsAnswered ??
      raw.questionsAnsweredInSession ??
      DEFAULT_STATE.totalQuestionsAnswered,
  };
}

export function getGuestState(): GuestPersistedState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return normalizeState(JSON.parse(raw));
  } catch {
    return DEFAULT_STATE;
  }
}

export function setGuestState(state: GuestPersistedState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(state));
  notifyGuestProgress();
}

export function getRemainingFreeQuestions(state = getGuestState()): number {
  if (state.sessionsUsed >= GUEST_MAX_SESSIONS) return 0;
  return Math.max(0, GUEST_MAX_QUESTIONS - state.totalQuestionsAnswered);
}

export function shouldShowFreemiumGate(state = getGuestState()): boolean {
  return getRemainingFreeQuestions(state) <= 0;
}

export function hasActiveGuestSession(state = getGuestState()): boolean {
  return !!(state.activeSession && !isGuestSessionComplete(state.activeSession));
}

export function canStartGuestSession(state = getGuestState()): boolean {
  if (shouldShowFreemiumGate(state)) return false;
  if (hasActiveGuestSession(state)) return true;
  return state.sessionsUsed < GUEST_MAX_SESSIONS && getRemainingFreeQuestions(state) > 0;
}

export function isGuestSessionComplete(session: GuestSession): boolean {
  return Object.keys(session.answers).length >= session.totalQuestions;
}

export function capGuestSession(session: GuestSession, maxQuestions: number): GuestSession {
  const totalQuestions = Math.min(session.totalQuestions, maxQuestions, session.questions.length);
  return {
    ...session,
    totalQuestions,
    questions: session.questions.slice(0, totalQuestions),
  };
}

export function recordGuestAnswer(
  sessionId: string,
  questionId: string,
  answer: GuestAnswer
): GuestPersistedState {
  const state = getGuestState();
  if (!state.activeSession || state.activeSession.id !== sessionId) return state;

  const alreadyAnswered = !!state.activeSession.answers[questionId];
  const answers = { ...state.activeSession.answers, [questionId]: answer };
  const correct = Object.values(answers).filter((a) => a.correct).length;
  const totalQuestionsAnswered = alreadyAnswered
    ? state.totalQuestionsAnswered
    : state.totalQuestionsAnswered + 1;

  const next: GuestPersistedState = {
    ...state,
    totalQuestionsAnswered,
    activeSession: {
      ...state.activeSession,
      answers,
      correct,
    },
  };

  setGuestState(next);
  return next;
}

export function completeGuestSession(sessionId: string): GuestPersistedState {
  const state = getGuestState();
  if (!state.activeSession || state.activeSession.id !== sessionId) {
    return markGuestSessionExhausted();
  }

  const next: GuestPersistedState = {
    ...state,
    sessionsUsed: GUEST_MAX_SESSIONS,
    activeSession: null,
  };
  setGuestState(next);
  return next;
}

export function markGuestSessionExhausted(): GuestPersistedState {
  const state = getGuestState();
  const next: GuestPersistedState = {
    ...state,
    sessionsUsed: GUEST_MAX_SESSIONS,
    activeSession: null,
  };
  setGuestState(next);
  return next;
}

export function saveGuestSession(session: GuestSession): void {
  const state = getGuestState();
  setGuestState({ ...state, activeSession: session });
}

export function startGuestSession(session: GuestSession): boolean {
  const state = getGuestState();
  if (shouldShowFreemiumGate(state)) return false;
  if (state.sessionsUsed >= GUEST_MAX_SESSIONS && !hasActiveGuestSession(state)) return false;

  const remaining = getRemainingFreeQuestions(state);
  if (remaining <= 0) return false;

  const capped = capGuestSession(session, remaining);
  if (capped.totalQuestions <= 0 || capped.questions.length === 0) return false;

  setGuestState({
    ...state,
    activeSession: capped,
  });
  return true;
}

export function dismissGuestBanner(): void {
  const state = getGuestState();
  setGuestState({ ...state, bannerDismissed: true });
}

export type GuestServerStatus = {
  remaining: number;
  questionsAnswered: number;
  exhausted: boolean;
  gated: boolean;
  maxQuestions: number;
};

export function applyServerGuestStatus(data: GuestServerStatus): GuestPersistedState {
  const state = getGuestState();
  const totalQuestionsAnswered = Math.max(
    state.totalQuestionsAnswered,
    data.questionsAnswered ?? 0
  );
  const next: GuestPersistedState = {
    ...state,
    totalQuestionsAnswered,
    sessionsUsed: data.gated ? GUEST_MAX_SESSIONS : state.sessionsUsed,
  };
  setGuestState(next);
  return next;
}

export async function syncGuestWithServer(): Promise<GuestServerStatus | null> {
  try {
    const res = await fetch("/api/guest/status");
    if (!res.ok) return null;
    const data = (await res.json()) as GuestServerStatus;
    applyServerGuestStatus(data);
    return data;
  } catch {
    return null;
  }
}

export async function recordGuestAnswerOnServer(questionId: string): Promise<GuestServerStatus | null> {
  try {
    const res = await fetch("/api/guest/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question_id: questionId }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as GuestServerStatus;
    applyServerGuestStatus(data);
    return data;
  } catch {
    return null;
  }
}

export async function completeGuestSessionOnServer(): Promise<void> {
  try {
    const res = await fetch("/api/guest/complete", { method: "POST" });
    if (res.ok) {
      const data = (await res.json()) as GuestServerStatus;
      applyServerGuestStatus(data);
    }
  } catch {
    // ignore network errors; local state still updated
  }
}
