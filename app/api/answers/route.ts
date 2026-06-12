import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gradeAnswer } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { session_id, question_id, answer_given, time_secs, confidence } = body;

  const { data: question } = await supabase
    .from("questions")
    .select("correct_answer, explanation")
    .eq("id", question_id)
    .single();

  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  const isCorrect = gradeAnswer(answer_given, question.correct_answer);

  const { data: answer, error } = await supabase
    .from("session_answers")
    .upsert(
      {
        session_id,
        user_id: user.id,
        question_id,
        answer_given,
        is_correct: isCorrect,
        time_secs,
        confidence: confidence ?? null,
      },
      { onConflict: "session_id,question_id" }
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { count: correctCount } = await supabase
    .from("session_answers")
    .select("*", { count: "exact", head: true })
    .eq("session_id", session_id)
    .eq("is_correct", true);

  await supabase
    .from("sessions")
    .update({ correct: correctCount ?? 0 })
    .eq("id", session_id);

  return NextResponse.json({
    answer,
    isCorrect,
    correctAnswer: question.correct_answer,
    explanation: question.explanation,
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { session_id, question_id, scratch_pad, strikethrough, calculator_used } = body;

  const { error } = await supabase.from("session_tools").upsert(
    {
      session_id,
      question_id,
      scratch_pad: scratch_pad ?? null,
      strikethrough: strikethrough ?? [],
      calculator_used: calculator_used ?? false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id,question_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
