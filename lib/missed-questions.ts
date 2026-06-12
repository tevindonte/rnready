import { createClient } from "@/lib/supabase/server";

/** Unique question IDs the user answered incorrectly in completed sessions. */
export async function getMissedQuestionIds(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("session_answers")
    .select("question_id, sessions!inner(status)")
    .eq("user_id", userId)
    .eq("is_correct", false)
    .eq("sessions.status", "completed");

  return Array.from(new Set((data ?? []).map((row) => row.question_id)));
}

export async function selectMissedQuestionIds(
  userId: string,
  count: number
): Promise<string[]> {
  const supabase = await createClient();
  const missed = await getMissedQuestionIds(userId);
  if (missed.length === 0) return [];

  const { data: questions } = await supabase
    .from("questions")
    .select("id")
    .in("id", missed)
    .eq("is_custom", false)
    .eq("needs_review", false);

  const ids = (questions ?? []).map((q) => q.id);
  return shuffle(ids).slice(0, count);
}

export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
