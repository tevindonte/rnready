import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  type FeedbackReason,
  type FeedbackVote,
  isValidFeedbackReason,
  maybeQuarantineQuestion,
} from "@/lib/question-feedback";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { questionId: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("question_feedback")
    .select("vote, reason, comment, updated_at")
    .eq("question_id", params.questionId)
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({ feedback: data ?? null });
}

export async function POST(
  request: Request,
  { params }: { params: { questionId: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const vote = body.vote as FeedbackVote;
  const sessionId = typeof body.session_id === "string" ? body.session_id : null;
  const comment =
    typeof body.comment === "string" ? body.comment.trim().slice(0, 500) : null;

  if (vote !== "up" && vote !== "down") {
    return NextResponse.json({ error: "vote must be 'up' or 'down'" }, { status: 400 });
  }

  let reason: FeedbackReason | null = null;
  if (vote === "down") {
    if (typeof body.reason !== "string" || !isValidFeedbackReason(body.reason)) {
      return NextResponse.json({ error: "A reason is required for down votes" }, { status: 400 });
    }
    reason = body.reason;
  }

  const { data: question } = await supabase
    .from("questions")
    .select("id")
    .eq("id", params.questionId)
    .maybeSingle();

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  if (sessionId) {
    const { data: session } = await supabase
      .from("sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }
  }

  const now = new Date().toISOString();
  const row = {
    question_id: params.questionId,
    user_id: user.id,
    session_id: sessionId,
    vote,
    reason,
    comment: comment || null,
    updated_at: now,
  };

  const { data: saved, error } = await supabase
    .from("question_feedback")
    .upsert(row, { onConflict: "question_id,user_id" })
    .select("vote, reason, comment, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (vote === "down" && reason) {
    await maybeQuarantineQuestion(params.questionId);
  }

  return NextResponse.json({ feedback: saved });
}
