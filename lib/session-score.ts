import type { SupabaseClient } from "@supabase/supabase-js";

export type SessionScore = {
  correct: number;
  total: number;
  percent: number;
};

type SessionRow = {
  id: string;
  correct: number | null;
  total_questions: number | null;
};

type AnswerRow = {
  session_id: string;
  is_correct: boolean | null;
};

export function computeSessionScore(
  questionCount: number,
  answers: { is_correct: boolean | null }[],
  storedCorrect?: number | null,
  storedTotal?: number | null
): SessionScore {
  const correctFromAnswers = answers.filter((a) => a.is_correct === true).length;
  const answeredCount = answers.length;

  const plannedTotal =
    questionCount > 0 ? questionCount : storedTotal ?? answeredCount;

  // Use questions actually answered when the session ended early.
  const total =
    answeredCount > 0 && answeredCount < plannedTotal ? answeredCount : plannedTotal;

  const correct = answers.length > 0 ? correctFromAnswers : storedCorrect ?? 0;
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

  return { correct, total, percent };
}

export async function attachSessionScores<T extends SessionRow>(
  supabase: SupabaseClient,
  sessions: T[]
): Promise<Array<T & SessionScore>> {
  if (sessions.length === 0) return [];

  const ids = sessions.map((s) => s.id);
  const [{ data: sqRows }, { data: answerRows }] = await Promise.all([
    supabase.from("session_questions").select("session_id").in("session_id", ids),
    supabase
      .from("session_answers")
      .select("session_id, is_correct")
      .in("session_id", ids),
  ]);

  const questionCounts = new Map<string, number>();
  for (const row of sqRows ?? []) {
    questionCounts.set(row.session_id, (questionCounts.get(row.session_id) ?? 0) + 1);
  }

  const answersBySession = new Map<string, { is_correct: boolean | null }[]>();
  for (const row of (answerRows ?? []) as AnswerRow[]) {
    const list = answersBySession.get(row.session_id) ?? [];
    list.push({ is_correct: row.is_correct });
    answersBySession.set(row.session_id, list);
  }

  return sessions.map((session) => ({
    ...session,
    ...computeSessionScore(
      questionCounts.get(session.id) ?? 0,
      answersBySession.get(session.id) ?? [],
      session.correct,
      session.total_questions
    ),
  }));
}

export async function recalculateSessionScore(
  supabase: SupabaseClient,
  sessionId: string
): Promise<SessionScore> {
  const [{ count: questionCount }, { data: answers }] = await Promise.all([
    supabase
      .from("session_questions")
      .select("*", { count: "exact", head: true })
      .eq("session_id", sessionId),
    supabase
      .from("session_answers")
      .select("is_correct")
      .eq("session_id", sessionId),
  ]);

  return computeSessionScore(questionCount ?? 0, answers ?? []);
}
