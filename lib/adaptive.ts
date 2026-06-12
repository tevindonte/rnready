import {
  NCLEX_CATEGORIES,
  NCLEX_WEIGHTS,
  type NclexCategory,
  type ReadinessLevel,
  getReadinessLevel,
} from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export type CategoryScore = {
  category: string;
  pct: number;
  count: number;
  isWeak: boolean;
};

export async function getCategoryScores(userId: string): Promise<CategoryScore[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("session_answers")
    .select("is_correct, questions(category)")
    .eq("user_id", userId);

  const byCategory: Record<string, { correct: number; total: number }> = {};

  for (const row of data ?? []) {
    const category = (row.questions as unknown as { category: string } | null)?.category;
    if (!category) continue;
    if (!byCategory[category]) byCategory[category] = { correct: 0, total: 0 };
    byCategory[category].total += 1;
    if (row.is_correct) byCategory[category].correct += 1;
  }

  return NCLEX_CATEGORIES.map((category) => {
    const stats = byCategory[category] ?? { correct: 0, total: 0 };
    const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
    return {
      category,
      pct,
      count: stats.total,
      isWeak: pct < 65 && stats.total >= 5,
    };
  });
}

export function getCategoryWeight(category: string, scores: CategoryScore[]): number {
  const score = scores.find((s) => s.category === category);
  if (!score || score.count === 0) return 2;
  if (score.isWeak) return 3;
  if (score.pct < 75) return 2;
  return 1;
}

export async function getSeenQuestionIds(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("session_answers")
    .select("question_id")
    .eq("user_id", userId);
  return Array.from(new Set((data ?? []).map((r) => r.question_id)));
}

export async function selectAdaptiveQuestions(
  userId: string,
  count: number,
  excludeIds: string[] = []
): Promise<string[]> {
  const supabase = await createClient();
  const scores = await getCategoryScores(userId);
  const seen = new Set([...(await getSeenQuestionIds(userId)), ...excludeIds]);

  const { data: questions } = await supabase
    .from("questions")
    .select("id, category")
    .eq("is_custom", false);

  if (!questions?.length) return [];

  const pool: { id: string; weight: number }[] = [];
  for (const q of questions) {
    if (seen.has(q.id)) continue;
    pool.push({ id: q.id, weight: getCategoryWeight(q.category, scores) });
  }

  const selected: string[] = [];
  const available = [...pool];

  while (selected.length < count && available.length > 0) {
    const totalWeight = available.reduce((sum, q) => sum + q.weight, 0);
    let roll = Math.random() * totalWeight;
    let pickedIndex = 0;
    for (let i = 0; i < available.length; i++) {
      roll -= available[i].weight;
      if (roll <= 0) {
        pickedIndex = i;
        break;
      }
    }
    selected.push(available[pickedIndex].id);
    available.splice(pickedIndex, 1);
  }

  return selected;
}

export async function selectSectionQuestions(
  category: string,
  count: number,
  userId: string,
  subcategories?: string[]
): Promise<string[]> {
  const supabase = await createClient();
  const seen = await getSeenQuestionIds(userId);

  let query = supabase
    .from("questions")
    .select("id")
    .eq("category", category)
    .eq("is_custom", false);

  if (subcategories?.length) {
    query = query.in("subcategory", subcategories);
  }

  const { data } = await query.limit(count * 3);

  const ids = (data ?? [])
    .map((q) => q.id)
    .filter((id) => !seen.includes(id));

  return shuffle(ids).slice(0, count);
}

export async function selectMixedQuestions(
  count: number,
  userId: string
): Promise<string[]> {
  const supabase = await createClient();
  const seen = await getSeenQuestionIds(userId);

  const { data } = await supabase
    .from("questions")
    .select("id")
    .eq("is_custom", false)
    .limit(count * 5);
  const ids = (data ?? [])
    .map((q) => q.id)
    .filter((id) => !seen.includes(id));

  return shuffle(ids).slice(0, count);
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function computeReadinessScore(userId: string): Promise<{
  weightedScore: number;
  level: ReadinessLevel;
  categoryScores: CategoryScore[];
}> {
  const categoryScores = await getCategoryScores(userId);
  let weightedScore = 0;
  let totalWeight = 0;

  for (const cat of NCLEX_CATEGORIES) {
    const score = categoryScores.find((s) => s.category === cat);
    const weight = NCLEX_WEIGHTS[cat as NclexCategory];
    if (score && score.count > 0) {
      weightedScore += score.pct * weight;
      totalWeight += weight;
    }
  }

  const normalized = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
  return {
    weightedScore: normalized,
    level: getReadinessLevel(normalized),
    categoryScores,
  };
}

export async function getAvgTimeByCategory(userId: string): Promise<{ category: string; avgSecs: number }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("session_answers")
    .select("time_secs, questions(category)")
    .eq("user_id", userId);

  const byCategory: Record<string, { total: number; count: number }> = {};

  for (const row of data ?? []) {
    const category = (row.questions as unknown as { category: string } | null)?.category;
    if (!category || row.time_secs == null) continue;
    if (!byCategory[category]) byCategory[category] = { total: 0, count: 0 };
    byCategory[category].total += row.time_secs;
    byCategory[category].count += 1;
  }

  return NCLEX_CATEGORIES.map((category) => {
    const stats = byCategory[category];
    return {
      category,
      avgSecs: stats ? Math.round(stats.total / stats.count) : 0,
    };
  }).filter((r) => r.avgSecs > 0);
}
