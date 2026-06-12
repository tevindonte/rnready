import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateExplanation } from "@/lib/openai";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { question_id } = await request.json();
  if (!question_id) return NextResponse.json({ error: "question_id required" }, { status: 400 });

  const { data: question } = await supabase
    .from("questions")
    .select("*")
    .eq("id", question_id)
    .single();

  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  if (question.explanation) {
    return NextResponse.json({ explanation: question.explanation });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Explanation not available" }, { status: 503 });
  }

  const explanation = await generateExplanation(
    question.question,
    question.options as Record<string, string>,
    question.correct_answer,
    question.source_verbatim
  );

  await supabase
    .from("questions")
    .update({
      explanation,
      explanation_generated_at: new Date().toISOString(),
    })
    .eq("id", question_id);

  return NextResponse.json({ explanation });
}
