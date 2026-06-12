import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QuizSessionClient } from "@/components/quiz/QuizSessionClient";
import type { Question, Session } from "@/lib/constants";

export default async function QuizSessionPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", params.sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) redirect("/quiz/config");
  if (session.ended_at) redirect(`/quiz/${params.sessionId}/review`);

  const { data: sq } = await supabase
    .from("session_questions")
    .select("question_id, order_index, questions(*)")
    .eq("session_id", params.sessionId)
    .order("order_index");

  const sessionQuestions = (sq ?? []).map((row) => ({
    question_id: row.question_id as string,
    order_index: row.order_index as number,
    questions: row.questions as unknown as Question,
  }));

  return (
    <QuizSessionClient
      session={session as Session}
      sessionQuestions={sessionQuestions}
    />
  );
}
