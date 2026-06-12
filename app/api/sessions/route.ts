import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  selectAdaptiveQuestions,
  selectMixedQuestions,
  selectSectionQuestions,
  topUpQuestionIds,
} from "@/lib/adaptive";
import type { QuizMode } from "@/lib/constants";
import { touchLastSessionAt } from "@/lib/entitlements";
import { recalculateSessionScore } from "@/lib/session-score";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const mode = body.mode as QuizMode;
  const categoryFilter = body.category_filter as string | null;
  const subcategoryFilter = body.subcategory_filter as string[] | null;
  const totalQuestions = body.total_questions as number;
  const title =
    typeof body.title === "string" && body.title.trim() ? body.title.trim().slice(0, 80) : null;

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
    questionIds = await selectSectionQuestions(
      categoryFilter!,
      totalQuestions,
      user.id,
      subcategoryFilter ?? undefined
    );
  } else {
    questionIds = await selectMixedQuestions(totalQuestions, user.id);
  }

  if (questionIds.length === 0) {
    const { data: fallback } = await supabase
      .from("questions")
      .select("id")
      .eq("is_custom", false)
      .eq("needs_review", false)
      .limit(totalQuestions);
    questionIds = (fallback ?? []).map((q) => q.id);
  }

  if (questionIds.length === 0) {
    return NextResponse.json({ error: "No questions available. Run the ingestion pipeline first." }, { status: 400 });
  }

  questionIds = await topUpQuestionIds(
    supabase,
    questionIds,
    totalQuestions,
    mode === "section" && categoryFilter
      ? { category: categoryFilter, subcategories: subcategoryFilter ?? undefined }
      : undefined
  );

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      mode,
      category_filter: categoryFilter,
      subcategory_filter: subcategoryFilter,
      total_questions: Math.min(totalQuestions, questionIds.length),
      title,
      status: "in_progress",
      current_index: 0,
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

  await touchLastSessionAt(supabase, user.id);

  return NextResponse.json({
    sessionId: session.id,
    questionCount: sessionQuestions.length,
    requestedCount: totalQuestions,
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    session_id,
    correct,
    duration_secs,
    ended_at,
    current_index,
    status,
    title,
  } = body;

  const updates: Record<string, unknown> = {};
  if (duration_secs !== undefined) updates.duration_secs = duration_secs;
  if (current_index !== undefined) updates.current_index = current_index;
  if (title !== undefined) {
    updates.title =
      typeof title === "string" && title.trim() ? title.trim().slice(0, 80) : null;
  }

  const isCompleting = ended_at !== undefined || status === "completed";

  if (isCompleting) {
    updates.status = "completed";
    updates.ended_at =
      typeof ended_at === "string" ? ended_at : new Date().toISOString();
    const score = await recalculateSessionScore(supabase, session_id);
    updates.correct = score.correct;
    updates.total_questions = score.total;
  } else {
    if (status !== undefined) updates.status = status;
    if (correct !== undefined) updates.correct = correct;
  }

  const { error } = await supabase
    .from("sessions")
    .update(updates)
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
