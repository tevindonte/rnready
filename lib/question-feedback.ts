import { createAdminClient } from "@/lib/supabase/admin";

export type FeedbackVote = "up" | "down";

export type FeedbackReason =
  | "formatting"
  | "wrong_answer"
  | "bad_explanation"
  | "typo_unclear"
  | "other";

export const FEEDBACK_REASONS: {
  value: FeedbackReason;
  label: string;
}[] = [
  { value: "formatting", label: "Text looks broken or hard to read" },
  { value: "wrong_answer", label: "I think the correct answer is wrong" },
  { value: "bad_explanation", label: "Explanation doesn't help" },
  { value: "typo_unclear", label: "Typo or unclear wording" },
  { value: "other", label: "Other" },
];

export const QUARANTINE_REASONS: FeedbackReason[] = ["formatting", "wrong_answer"];
export const QUARANTINE_DOWN_VOTE_THRESHOLD = 3;

export function isValidFeedbackReason(value: string): value is FeedbackReason {
  return FEEDBACK_REASONS.some((r) => r.value === value);
}

/** Pull flagged questions from rotation after enough serious down-votes. */
export async function maybeQuarantineQuestion(questionId: string): Promise<void> {
  const supabase = createAdminClient();

  const { count } = await supabase
    .from("question_feedback")
    .select("*", { count: "exact", head: true })
    .eq("question_id", questionId)
    .eq("vote", "down")
    .in("reason", QUARANTINE_REASONS);

  if ((count ?? 0) < QUARANTINE_DOWN_VOTE_THRESHOLD) return;

  await supabase.from("questions").update({ needs_review: true }).eq("id", questionId);
}
