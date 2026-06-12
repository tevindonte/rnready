import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GUEST_MAX_QUESTIONS } from "@/lib/guest";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requested = parseInt(searchParams.get("count") ?? String(GUEST_MAX_QUESTIONS), 10);
  const count = Math.min(
    Number.isFinite(requested) && requested > 0 ? requested : GUEST_MAX_QUESTIONS,
    GUEST_MAX_QUESTIONS
  );
  const category = searchParams.get("category");

  const supabase = createAdminClient();
  let query = supabase.from("questions").select("*").eq("is_custom", false);

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query.limit(count * 5);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data?.length) {
    return NextResponse.json({ error: "No questions available" }, { status: 404 });
  }

  const shuffled = [...data].sort(() => Math.random() - 0.5).slice(0, count);

  return NextResponse.json({ questions: shuffled, maxAllowed: GUEST_MAX_QUESTIONS });
}
