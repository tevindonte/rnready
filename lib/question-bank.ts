import type { SupabaseClient } from "@supabase/supabase-js";
import { NCLEX_CATEGORIES } from "@/lib/constants";

export type QuestionBankStats = {
  sharedTotal: number;
  customTotal: number;
  byCategory: { category: string; count: number }[];
  bySubcategory?: Record<string, Record<string, number>>;
};

export function formatQuestionCount(count: number): string {
  return count.toLocaleString();
}

export async function getSharedQuestionBankStats(
  supabase: SupabaseClient
): Promise<Omit<QuestionBankStats, "customTotal">> {
  const { count: sharedTotal } = await supabase
    .from("questions")
    .select("*", { count: "exact", head: true })
    .eq("is_custom", false);

  const byCategory = await Promise.all(
    NCLEX_CATEGORIES.map(async (category) => {
      const { count } = await supabase
        .from("questions")
        .select("*", { count: "exact", head: true })
        .eq("is_custom", false)
        .eq("category", category);
      return { category, count: count ?? 0 };
    })
  );

  return {
    sharedTotal: sharedTotal ?? 0,
    byCategory,
    bySubcategory: await getSubcategoryCounts(supabase),
  };
}

export async function getSubcategoryCounts(
  supabase: SupabaseClient,
  category?: string
): Promise<Record<string, Record<string, number>>> {
  const { SUBCATEGORIES } = await import("@/lib/subcategories");
  const result: Record<string, Record<string, number>> = {};

  const categories = category ? [category] : [...NCLEX_CATEGORIES];

  for (const cat of categories) {
    const subs = SUBCATEGORIES[cat as keyof typeof SUBCATEGORIES] ?? ["General"];
    result[cat] = {};
    for (const sub of subs) {
      const { count } = await supabase
        .from("questions")
        .select("*", { count: "exact", head: true })
        .eq("is_custom", false)
        .eq("category", cat)
        .eq("subcategory", sub);
      result[cat][sub] = count ?? 0;
    }
  }

  return result;
}

export async function getUserCustomQuestionCount(supabase: SupabaseClient): Promise<number> {
  const { count } = await supabase
    .from("questions")
    .select("*", { count: "exact", head: true })
    .eq("is_custom", true);

  return count ?? 0;
}

export async function getQuestionBankStats(
  sharedSupabase: SupabaseClient,
  userSupabase?: SupabaseClient | null
): Promise<QuestionBankStats> {
  const shared = await getSharedQuestionBankStats(sharedSupabase);
  const customTotal = userSupabase ? await getUserCustomQuestionCount(userSupabase) : 0;

  return { ...shared, customTotal };
}
