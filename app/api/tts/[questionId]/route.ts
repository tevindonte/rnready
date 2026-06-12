import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canUseTtsRationales, type SubscriptionStatus } from "@/lib/entitlements";
import { getOrCreateQuestionAudioUrl, type QuestionAudioPart } from "@/lib/tts";

export const dynamic = "force-dynamic";

function parsePart(value: string | null): QuestionAudioPart {
  return value === "question" ? "question" : "explanation";
}

export async function GET(
  request: Request,
  { params }: { params: { questionId: string } }
) {
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
    !canUseTtsRationales(
      (profile?.subscription_status ?? "free") as SubscriptionStatus,
      profile?.subscription_past_due_at
    )
  ) {
    return NextResponse.json(
      { error: "Audio is a Plus feature.", upgradeRequired: true },
      { status: 403 }
    );
  }

  const part = parsePart(new URL(request.url).searchParams.get("part"));

  const { data: question } = await supabase
    .from("questions")
    .select("question, explanation, question_audio_url, explanation_audio_url")
    .eq("id", params.questionId)
    .single();

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const text = part === "question" ? question.question : question.explanation;
  if (!text?.trim()) {
    return NextResponse.json(
      { error: part === "question" ? "No question text available" : "No explanation available" },
      { status: 404 }
    );
  }

  const cachedUrl =
    part === "question" ? question.question_audio_url : question.explanation_audio_url;

  try {
    const audioUrl =
      cachedUrl ?? (await getOrCreateQuestionAudioUrl(params.questionId, part, text));

    return NextResponse.json({ audioUrl, cached: Boolean(cachedUrl), part });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate audio" },
      { status: 500 }
    );
  }
}
