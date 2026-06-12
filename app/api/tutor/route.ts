import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  canUseAiTutor,
  type SubscriptionStatus,
} from "@/lib/entitlements";
import {
  generateTutorReply,
  TUTOR_MAX_MESSAGES,
  type TutorMessage,
} from "@/lib/ai-tutor";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionId = new URL(request.url).searchParams.get("session_id");
  const questionId = new URL(request.url).searchParams.get("question_id");
  if (!sessionId || !questionId) {
    return NextResponse.json({ error: "session_id and question_id required" }, { status: 400 });
  }

  const { data: answer } = await supabase
    .from("session_answers")
    .select("id")
    .eq("session_id", sessionId)
    .eq("question_id", questionId)
    .eq("user_id", user.id)
    .single();

  if (!answer) return NextResponse.json({ messages: [], remaining: TUTOR_MAX_MESSAGES });

  const { data: conversation } = await supabase
    .from("tutor_conversations")
    .select("messages")
    .eq("session_answer_id", answer.id)
    .maybeSingle();

  const messages = (conversation?.messages ?? []) as TutorMessage[];
  return NextResponse.json({
    messages,
    remaining: Math.max(0, TUTOR_MAX_MESSAGES - messages.filter((m) => m.role === "user").length),
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status, subscription_past_due_at")
    .eq("id", user.id)
    .single();

  if (
    !canUseAiTutor(
      (profile?.subscription_status ?? "free") as SubscriptionStatus,
      profile?.subscription_past_due_at
    )
  ) {
    return NextResponse.json(
      { error: "AI tutor is a Plus feature.", upgradeRequired: true },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { session_id, question_id, message } = body;

  if (!session_id || !question_id || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "session_id, question_id, and message required" }, { status: 400 });
  }

  const { data: answer } = await supabase
    .from("session_answers")
    .select("id, answer_given, is_correct, questions(question, options, correct_answer, explanation)")
    .eq("session_id", session_id)
    .eq("question_id", question_id)
    .eq("user_id", user.id)
    .single();

  if (!answer) return NextResponse.json({ error: "Answer not found" }, { status: 404 });

  const q = answer.questions as unknown as {
    question: string;
    options: Record<string, string>;
    correct_answer: string;
    explanation: string | null;
  };

  const { data: existing } = await supabase
    .from("tutor_conversations")
    .select("id, messages")
    .eq("session_answer_id", answer.id)
    .maybeSingle();

  const history = ((existing?.messages ?? []) as TutorMessage[]).filter(
    (m) => m.role === "user" || m.role === "assistant"
  );
  const userMessageCount = history.filter((m) => m.role === "user").length;

  if (userMessageCount >= TUTOR_MAX_MESSAGES) {
    return NextResponse.json(
      { error: `Limit reached (${TUTOR_MAX_MESSAGES} messages per question).` },
      { status: 429 }
    );
  }

  const userMessage = message.trim().slice(0, 1000);
  const reply = await generateTutorReply(
    {
      question: q.question,
      options: q.options,
      correctAnswer: q.correct_answer,
      answerGiven: answer.answer_given ?? "",
      isCorrect: Boolean(answer.is_correct),
      explanation: q.explanation,
    },
    history,
    userMessage
  );

  const updatedMessages: TutorMessage[] = [
    ...history,
    { role: "user", content: userMessage },
    { role: "assistant", content: reply },
  ];

  if (existing?.id) {
    await supabase
      .from("tutor_conversations")
      .update({ messages: updatedMessages, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase.from("tutor_conversations").insert({
      session_answer_id: answer.id,
      user_id: user.id,
      messages: updatedMessages,
    });
  }

  return NextResponse.json({
    messages: updatedMessages,
    remaining: Math.max(0, TUTOR_MAX_MESSAGES - userMessageCount - 1),
  });
}
