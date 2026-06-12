import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SessionReviewClient } from "@/components/quiz/SessionReviewClient";
import { computeSessionScore } from "@/lib/session-score";

export default async function SessionReviewPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", params.sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) redirect("/quiz/config");

  const { data: sq } = await supabase
    .from("session_questions")
    .select("question_id, order_index, questions(*)")
    .eq("session_id", params.sessionId)
    .order("order_index");

  const { data: answers } = await supabase
    .from("session_answers")
    .select("*")
    .eq("session_id", params.sessionId);

  const answerMap = new Map((answers ?? []).map((a) => [a.question_id, a]));
  const questionCount = sq?.length ?? 0;
  const score = computeSessionScore(
    questionCount,
    answers ?? [],
    session.correct,
    session.total_questions
  );

  const questions = (sq ?? []).map((item, index) => {
    const q = item.questions as unknown as {
      id: string;
      question: string;
      options: Record<string, string>;
      correct_answer: string;
      explanation: string | null;
      category: string;
    };
    const answer = answerMap.get(item.question_id);
    return {
      id: item.question_id,
      index,
      question: q.question,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      category: q.category,
      answerGiven: answer?.answer_given ?? null,
      isCorrect: answer?.is_correct ?? false,
    };
  });

  return (
    <SessionReviewClient
      sessionId={params.sessionId}
      mode={session.mode}
      correct={score.correct}
      total={score.total}
      durationSecs={session.duration_secs}
      questions={questions}
    />
  );
}
