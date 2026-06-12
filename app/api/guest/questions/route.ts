import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GUEST_MAX_QUESTIONS } from "@/lib/guest";
import {
  allocateQuestionCountsByNclexWeight,
  selectStratifiedQuestionIds,
} from "@/lib/nclex-distribution";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requested = parseInt(searchParams.get("count") ?? String(GUEST_MAX_QUESTIONS), 10);
  const count = Math.min(
    Number.isFinite(requested) && requested > 0 ? requested : GUEST_MAX_QUESTIONS,
    GUEST_MAX_QUESTIONS
  );
  const category = searchParams.get("category");
  const subcategoriesParam = searchParams.get("subcategories");
  const subcategories = subcategoriesParam
    ? subcategoriesParam.split(",").map((s) => decodeURIComponent(s.trim())).filter(Boolean)
    : [];

  const supabase = createAdminClient();
  let query = supabase.from("questions").select("*").eq("is_custom", false).eq("needs_review", false);

  if (category) {
    query = query.eq("category", category);
  }
  if (subcategories.length > 0) {
    query = query.in("subcategory", subcategories);
  }

  const { data, error } = await query.limit(count * 5);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data?.length) {
    return NextResponse.json({ error: "No questions available" }, { status: 404 });
  }

  let shuffled: typeof data;
  if (category) {
    shuffled = [...data].sort(() => Math.random() - 0.5).slice(0, count);
  } else {
    const allocation = allocateQuestionCountsByNclexWeight(count);
    const ids = selectStratifiedQuestionIds(
      data.map((q) => ({ id: q.id, category: q.category })),
      allocation,
      new Set()
    );
    const byId = new Map(data.map((q) => [q.id, q]));
    shuffled = ids.map((id) => byId.get(id)).filter(Boolean) as typeof data;
  }

  return NextResponse.json({ questions: shuffled, maxAllowed: GUEST_MAX_QUESTIONS });
}
