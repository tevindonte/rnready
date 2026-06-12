import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { shareCode: string } }
) {
  const admin = createAdminClient();
  const { data: guide, error } = await admin
    .from("study_guides")
    .select("id, title, question_count, take_count, is_public")
    .eq("share_code", params.shareCode.toUpperCase())
    .eq("is_public", true)
    .single();

  if (error || !guide) {
    return NextResponse.json({ error: "Study guide not found" }, { status: 404 });
  }

  const { data: questions } = await admin
    .from("questions")
    .select(
      "id, question, options, correct_answer, category, subcategory, difficulty, is_ngn, ngn_type, explanation"
    )
    .eq("study_guide_id", guide.id);

  return NextResponse.json({
    guide,
    questionIds: (questions ?? []).map((q) => q.id),
    questions: questions ?? [],
  });
}

export async function POST(
  _request: Request,
  { params }: { params: { shareCode: string } }
) {
  const admin = createAdminClient();
  const { data: guide } = await admin
    .from("study_guides")
    .select("id, take_count")
    .eq("share_code", params.shareCode.toUpperCase())
    .eq("is_public", true)
    .single();

  if (!guide) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await admin
    .from("study_guides")
    .update({ take_count: (guide.take_count ?? 0) + 1 })
    .eq("id", guide.id);

  return NextResponse.json({ ok: true });
}
