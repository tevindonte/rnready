import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractQuestionsFromNotes, countWords } from "@/lib/extraction";
import { generateExplanation } from "@/lib/openai";

const MAX_WORDS = 6000;
const MIN_QUESTIONS = 5;
const MAX_QUESTIONS = 30;

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI not configured" }, { status: 503 });
  }

  const body = await request.json();
  const notes = (body.notes as string)?.trim();
  const questionCount = Math.min(
    MAX_QUESTIONS,
    Math.max(MIN_QUESTIONS, Number(body.question_count) || 10)
  );
  const categoryHint = body.category as string | undefined;

  if (!notes) {
    return NextResponse.json({ error: "notes are required" }, { status: 400 });
  }

  if (countWords(notes) > MAX_WORDS) {
    return NextResponse.json(
      { error: `Notes too long. Maximum ${MAX_WORDS} words for v1.` },
      { status: 400 }
    );
  }

  let extracted;
  try {
    extracted = await extractQuestionsFromNotes(notes, questionCount);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Extraction failed" },
      { status: 500 }
    );
  }

  if (extracted.length === 0) {
    return NextResponse.json(
      { error: "Could not generate questions from these notes. Try adding more clinical facts." },
      { status: 400 }
    );
  }

  const sourceId = `user:${user.id}:${Date.now()}`;
  const questionIds: string[] = [];

  for (const q of extracted) {
    const category = categoryHint || q.category;
    let explanation = q.source_rationale ?? null;
    if (!explanation) {
      explanation = await generateExplanation(
        q.question,
        q.options,
        q.correct_answer,
        q.source_rationale,
        q.source_fact
      );
    }

    const { data: inserted, error } = await supabase
      .from("questions")
      .insert({
        question: q.question,
        options: q.options,
        correct_answer: q.correct_answer,
        category,
        subcategory: q.subcategory ?? null,
        is_ngn: q.is_ngn,
        ngn_type: q.ngn_type,
        content_origin: q.content_origin,
        source_fact: q.source_fact ?? null,
        source_verbatim: q.source_rationale ?? null,
        explanation,
        explanation_generated_at: new Date().toISOString(),
        source_id: sourceId,
        is_custom: true,
        custom_owner_id: user.id,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      console.error("Insert custom question failed:", error?.message);
      continue;
    }
    questionIds.push(inserted.id);
  }

  if (questionIds.length === 0) {
    return NextResponse.json({ error: "Failed to save generated questions" }, { status: 500 });
  }

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      mode: "custom",
      category_filter: categoryHint ?? null,
      total_questions: questionIds.length,
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: sessionError?.message ?? "Failed to create session" }, { status: 500 });
  }

  const sessionQuestions = questionIds.map((questionId, index) => ({
    session_id: session.id,
    question_id: questionId,
    order_index: index,
  }));

  const { error: sqError } = await supabase.from("session_questions").insert(sessionQuestions);
  if (sqError) {
    return NextResponse.json({ error: sqError.message }, { status: 500 });
  }

  return NextResponse.json({ sessionId: session.id, questionCount: questionIds.length });
}
