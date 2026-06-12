import {
  MOCK_EXAM_QUESTION_COUNT,
  NCLEX_CATEGORIES,
  NCLEX_WEIGHTS,
  type NclexCategory,
} from "@/lib/constants";

export type CategoryQuestion = { id: string; category: string };

/** Bank share per category (0–1). */
export function computeCategoryBankShares(
  questions: { category: string }[]
): Record<NclexCategory, number> {
  const counts: Partial<Record<NclexCategory, number>> = {};
  for (const q of questions) {
    const cat = q.category as NclexCategory;
    if (!NCLEX_CATEGORIES.includes(cat)) continue;
    counts[cat] = (counts[cat] ?? 0) + 1;
  }
  const total = questions.length || 1;
  return Object.fromEntries(
    NCLEX_CATEGORIES.map((cat) => [cat, (counts[cat] ?? 0) / total])
  ) as Record<NclexCategory, number>;
}

/**
 * Boost underrepresented categories and dampen overrepresented ones
 * relative to NCLEX test-plan weights.
 */
export function computeScarcityMultipliers(
  bankShares: Record<NclexCategory, number>
): Record<NclexCategory, number> {
  const multipliers = {} as Record<NclexCategory, number>;
  for (const cat of NCLEX_CATEGORIES) {
    const target = NCLEX_WEIGHTS[cat];
    const actual = bankShares[cat] ?? 0;
    if (actual <= 0) {
      multipliers[cat] = 1;
    } else {
      multipliers[cat] = Math.min(6, Math.max(0.25, target / actual));
    }
  }
  return multipliers;
}

/** Split a session size across categories using NCLEX weight midpoints. */
export function allocateQuestionCountsByNclexWeight(
  totalCount: number
): Record<NclexCategory, number> {
  const allocation = Object.fromEntries(NCLEX_CATEGORIES.map((cat) => [cat, 0])) as Record<
    NclexCategory,
    number
  >;

  const remainders: { cat: NclexCategory; remainder: number }[] = [];
  let assigned = 0;

  for (const cat of NCLEX_CATEGORIES) {
    const exact = totalCount * NCLEX_WEIGHTS[cat];
    const floor = Math.floor(exact);
    allocation[cat] = floor;
    assigned += floor;
    remainders.push({ cat, remainder: exact - floor });
  }

  remainders.sort((a, b) => b.remainder - a.remainder);
  let left = totalCount - assigned;
  for (let i = 0; left > 0; i++, left--) {
    allocation[remainders[i % remainders.length].cat] += 1;
  }

  return allocation;
}

export function selectStratifiedQuestionIds(
  pool: CategoryQuestion[],
  allocation: Record<NclexCategory, number>,
  seen: Set<string>
): string[] {
  const targetTotal = Object.values(allocation).reduce((sum, n) => sum + n, 0);
  const byCategory: Record<string, string[]> = {};

  for (const q of pool) {
    if (seen.has(q.id)) continue;
    if (!byCategory[q.category]) byCategory[q.category] = [];
    byCategory[q.category].push(q.id);
  }

  const selected: string[] = [];
  const picked = new Set<string>();

  for (const cat of NCLEX_CATEGORIES) {
    const need = allocation[cat];
    const ids = shuffle(byCategory[cat] ?? []);
    let added = 0;
    for (const id of ids) {
      if (added >= need) break;
      if (picked.has(id)) continue;
      picked.add(id);
      selected.push(id);
      added += 1;
    }
  }

  if (selected.length < targetTotal) {
    const remaining = shuffle(
      pool.filter((q) => !seen.has(q.id) && !picked.has(q.id)).map((q) => q.id)
    );
    for (const id of remaining) {
      if (selected.length >= targetTotal) break;
      selected.push(id);
    }
  }

  return shuffle(selected);
}

export function selectMockExamAllocation(): Record<NclexCategory, number> {
  return allocateQuestionCountsByNclexWeight(MOCK_EXAM_QUESTION_COUNT);
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export type CategoryDistributionRow = {
  category: NclexCategory;
  nclexTargetPct: number;
  bankCount: number;
  bankPct: number;
  gapPct: number;
};

export function buildDistributionAudit(
  byCategory: { category: string; count: number }[],
  sharedTotal: number
): CategoryDistributionRow[] {
  return NCLEX_CATEGORIES.map((category) => {
    const bankCount = byCategory.find((c) => c.category === category)?.count ?? 0;
    const bankPct = sharedTotal > 0 ? (bankCount / sharedTotal) * 100 : 0;
    const nclexTargetPct = NCLEX_WEIGHTS[category] * 100;
    return {
      category,
      nclexTargetPct,
      bankCount,
      bankPct,
      gapPct: bankPct - nclexTargetPct,
    };
  });
}
