import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractQuestionsFromNotes, countWords, parseQuestionStyle, resolveQuestionStyleTag, type QuestionStyle } from "@/lib/extraction";
import { generateExplanation } from "@/lib/openai";
import { resolveSourceText } from "@/lib/study-guide-sources";
import { normalizeSubcategory } from "@/lib/subcategories";
import { canCreateStudyGuide, type SubscriptionStatus } from "@/lib/entitlements";

const MAX_WORDS = 6000;
const MIN_QUESTIONS = 5;
const MAX_QUESTIONS = 30;

export const dynamic = "force-dynamic";

async function generateQuizFromText(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  text: string,
  questionCount: number,
  categoryHint: string | undefined,
  options: {
    save: boolean;
    title?: string;
    sourceType: string;
    questionStyle: QuestionStyle;
  }
) {
  if (countWords(text) > MAX_WORDS) {
    throw new Error(`Content too long. Maximum ${MAX_WORDS} words.`);
  }
  if (text.trim().length < 50) {
    throw new Error("Not enough content to generate questions.");
  }

  const extracted = await extractQuestionsFromNotes(text, questionCount, options.questionStyle);
  if (extracted.length === 0) {
    throw new Error("Could not generate questions from this content. Try adding more clinical facts.");
  }

  let studyGuideId: string | null = null;
  if (options.save) {
    const { data: guide, error: guideError } = await supabase
      .from("study_guides")
      .insert({
        owner_id: userId,
        title: options.title || "Untitled study guide",
        source_type: options.sourceType,
        question_count: extracted.length,
      })
      .select("id")
      .single();
    if (guideError) throw new Error(guideError.message);
    studyGuideId = guide.id;
  }

  const sourceId = `user:${userId}:${Date.now()}`;
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
        subcategory: normalizeSubcategory(category, q.subcategory ?? null),
        is_ngn: q.is_ngn,
        ngn_type: q.ngn_type,
        content_origin: q.content_origin,
        source_fact: q.source_fact ?? null,
        source_verbatim: q.source_rationale ?? null,
        explanation,
        explanation_generated_at: new Date().toISOString(),
        source_id: sourceId,
        is_custom: true,
        custom_owner_id: userId,
        study_guide_id: studyGuideId,
        question_style: resolveQuestionStyleTag(options.questionStyle, q),
      })
      .select("id")
      .single();

    if (error || !inserted) continue;
    questionIds.push(inserted.id);
  }

  if (questionIds.length === 0) {
    throw new Error("Failed to save generated questions");
  }

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      user_id: userId,
      mode: "custom",
      category_filter: categoryHint ?? null,
      total_questions: questionIds.length,
      title: options.title?.trim() || null,
      status: "in_progress",
      current_index: 0,
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    throw new Error(sessionError?.message ?? "Failed to create session");
  }

  const sessionQuestions = questionIds.map((questionId, index) => ({
    session_id: session.id,
    question_id: questionId,
    order_index: index,
  }));

  const { error: sqError } = await supabase.from("session_questions").insert(sessionQuestions);
  if (sqError) throw new Error(sqError.message);

  return { sessionId: session.id, questionCount: questionIds.length, studyGuideId };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI not configured" }, { status: 503 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .single();

  const subscriptionStatus = (profile?.subscription_status ?? "free") as SubscriptionStatus;
  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file") as File | null;
      if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 });

      const save = form.get("save") !== "false";
      if (save) {
        const guideCheck = await canCreateStudyGuide(supabase, user.id, subscriptionStatus);
        if (!guideCheck.allowed) {
          return NextResponse.json(
            { error: guideCheck.reason, upgradeRequired: true },
            { status: 403 }
          );
        }
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const { text, sourceType } = await resolveSourceText({
        file: { buffer, filename: file.name },
      });

      const questionStyle = parseQuestionStyle(form.get("question_style"));

      const result = await generateQuizFromText(
        supabase,
        user.id,
        text,
        Math.min(MAX_QUESTIONS, Math.max(MIN_QUESTIONS, Number(form.get("question_count")) || 10)),
        (form.get("category") as string) || undefined,
        {
          save: form.get("save") !== "false",
          title: (form.get("title") as string) || file.name.replace(/\.[^.]+$/, ""),
          sourceType,
          questionStyle,
        }
      );
      return NextResponse.json(result);
    }

    const body = await request.json();
    const questionCount = Math.min(
      MAX_QUESTIONS,
      Math.max(MIN_QUESTIONS, Number(body.question_count) || 10)
    );
    const categoryHint = body.category as string | undefined;
    const save = body.save !== false;
    const title = body.title as string | undefined;
    const questionStyle = parseQuestionStyle(body.question_style);

    if (save) {
      const guideCheck = await canCreateStudyGuide(supabase, user.id, subscriptionStatus);
      if (!guideCheck.allowed) {
        return NextResponse.json(
          { error: guideCheck.reason, upgradeRequired: true },
          { status: 403 }
        );
      }
    }

    const { text, sourceType } = await resolveSourceText({
      notes: body.notes as string | undefined,
      url: body.url as string | undefined,
    });

    const result = await generateQuizFromText(
      supabase,
      user.id,
      text,
      questionCount,
      categoryHint,
      { save, title, sourceType, questionStyle }
    );
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 400 }
    );
  }
}
