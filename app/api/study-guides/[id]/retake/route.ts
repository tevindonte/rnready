import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: guide } = await supabase
    .from("study_guides")
    .select("id, title, question_count")
    .eq("id", params.id)
    .eq("owner_id", user.id)
    .single();

  if (!guide) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: questions } = await supabase
    .from("questions")
    .select("id")
    .eq("study_guide_id", guide.id)
    .order("created_at");

  const questionIds = (questions ?? []).map((q) => q.id);
  if (questionIds.length === 0) {
    return NextResponse.json({ error: "No questions in this study guide" }, { status: 400 });
  }

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      mode: "custom",
      total_questions: questionIds.length,
      status: "in_progress",
      current_index: 0,
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: sessionError?.message ?? "Failed" }, { status: 500 });
  }

  const rows = questionIds.map((questionId, index) => ({
    session_id: session.id,
    question_id: questionId,
    order_index: index,
  }));

  await supabase.from("session_questions").insert(rows);
  return NextResponse.json({ sessionId: session.id });
}
