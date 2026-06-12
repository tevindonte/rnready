import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  selectAdaptiveQuestions,
  selectMixedQuestions,
  selectSectionQuestions,
} from "@/lib/adaptive";
import type { QuizMode } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const mode = body.mode as QuizMode;
  const categoryFilter = body.category_filter as string | null;
  const totalQuestions = body.total_questions as number;

  if (!mode || !totalQuestions) {
    return NextResponse.json({ error: "mode and total_questions required" }, { status: 400 });
  }

  if (mode === "section" && !categoryFilter) {
    return NextResponse.json({ error: "category_filter required for section mode" }, { status: 400 });
  }

  let questionIds: string[] = [];

  if (mode === "adaptive") {
    questionIds = await selectAdaptiveQuestions(user.id, totalQuestions);
  } else if (mode === "section") {
    questionIds = await selectSectionQuestions(categoryFilter!, totalQuestions, user.id);
  } else {
    questionIds = await selectMixedQuestions(totalQuestions, user.id);
  }

  if (questionIds.length === 0) {
    const { data: fallback } = await supabase
      .from("questions")
      .select("id")
      .eq("is_custom", false)
      .limit(totalQuestions);
    questionIds = (fallback ?? []).map((q) => q.id);
  }

  if (questionIds.length === 0) {
    return NextResponse.json({ error: "No questions available. Run the ingestion pipeline first." }, { status: 400 });
  }

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      mode,
      category_filter: categoryFilter,
      total_questions: Math.min(totalQuestions, questionIds.length),
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: sessionError?.message ?? "Failed to create session" }, { status: 500 });
  }

  const sessionQuestions = questionIds.slice(0, totalQuestions).map((questionId, index) => ({
    session_id: session.id,
    question_id: questionId,
    order_index: index,
  }));

  const { error: sqError } = await supabase.from("session_questions").insert(sessionQuestions);
  if (sqError) {
    return NextResponse.json({ error: sqError.message }, { status: 500 });
  }

  return NextResponse.json({ sessionId: session.id });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { session_id, correct, duration_secs, ended_at } = body;

  const { error } = await supabase
    .from("sessions")
    .update({ correct, duration_secs, ended_at })
    .eq("id", session_id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const { data: sq } = await supabase
    .from("session_questions")
    .select("question_id, order_index, questions(*)")
    .eq("session_id", sessionId)
    .order("order_index");

  const { data: answers } = await supabase
    .from("session_answers")
    .select("*")
    .eq("session_id", sessionId);

  return NextResponse.json({ session, questions: sq, answers });
}
