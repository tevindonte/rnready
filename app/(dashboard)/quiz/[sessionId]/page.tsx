import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QuizSessionClient } from "@/components/quiz/QuizSessionClient";
import type { Question, Session } from "@/lib/constants";
import { canUseAiTutor, canUseTtsRationales, type SubscriptionStatus } from "@/lib/entitlements";

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

  const { data: existingAnswers } = await supabase
    .from("session_answers")
    .select("question_id, answer_given, is_correct")
    .eq("session_id", params.sessionId);

  const cachedIndex =
    typeof session.current_index === "number" ? session.current_index : undefined;

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .single();

  const subscriptionStatus = (profile?.subscription_status ?? "free") as SubscriptionStatus;
  const premiumFeatures = {
    aiTutorChat: canUseAiTutor(subscriptionStatus),
    ttsRationales: canUseTtsRationales(subscriptionStatus),
  };

  return (
    <QuizSessionClient
      session={session as Session}
      sessionQuestions={sessionQuestions}
      initialAnswers={existingAnswers ?? []}
      initialIndex={cachedIndex}
      premiumFeatures={premiumFeatures}
    />
  );
}
