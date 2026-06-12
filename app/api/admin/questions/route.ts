import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: flaggedQuestions } = await admin
    .from("questions")
    .select("id, question, category, subcategory, source_id, needs_review")
    .eq("needs_review", true)
    .order("category")
    .limit(100);

  const { data: feedbackLog } = await admin
    .from("question_feedback")
    .select(
      "id, vote, reason, comment, created_at, question_id, questions(question, category, needs_review)"
    )
    .eq("vote", "down")
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({
    flaggedQuestions: flaggedQuestions ?? [],
    recentDownVotes: feedbackLog ?? [],
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const questionId = body.question_id as string;
  const needsReview = body.needs_review as boolean;

  if (!questionId || typeof needsReview !== "boolean") {
    return NextResponse.json({ error: "question_id and needs_review required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("questions")
    .update({ needs_review: needsReview })
    .eq("id", questionId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
