import { MOCK_EXAM_QUESTION_COUNT, NCLEX_WEIGHTS, type NclexCategory } from "@/lib/constants";
import { allocateQuestionCountsByNclexWeight } from "@/lib/nclex-distribution";

export type MockOverlapWarning = {
  category: NclexCategory;
  poolCount: number;
  perMockCount: number;
  overlapRisk: "high" | "medium" | "low";
  message: string;
};

/** Warn when mock category allocation is a large share of a thin pool. */
export function getMockOverlapWarnings(
  byCategory: { category: string; count: number }[]
): MockOverlapWarning[] {
  const allocation = allocateQuestionCountsByNclexWeight(MOCK_EXAM_QUESTION_COUNT);
  const warnings: MockOverlapWarning[] = [];

  for (const cat of Object.keys(allocation) as NclexCategory[]) {
    const poolCount = byCategory.find((c) => c.category === cat)?.count ?? 0;
    const perMockCount = allocation[cat];
    if (poolCount === 0 || perMockCount === 0) continue;

    const ratio = perMockCount / poolCount;
    if (ratio >= 0.5) {
      warnings.push({
        category: cat,
        poolCount,
        perMockCount,
        overlapRisk: "high",
        message: `${cat}: each mock uses ~${perMockCount} of ${poolCount} questions (${Math.round(ratio * 100)}%). Back-to-back mocks may repeat heavily until the bank grows.`,
      });
    } else if (ratio >= 0.25) {
      warnings.push({
        category: cat,
        poolCount,
        perMockCount,
        overlapRisk: "medium",
        message: `${cat}: mock pulls ${perMockCount} of ${poolCount} available — some repetition across multiple mocks.`,
      });
    }
  }

  return warnings.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.overlapRisk] - order[b.overlapRisk];
  });
}

export function formatNclexWeight(cat: NclexCategory): string {
  return `${Math.round(NCLEX_WEIGHTS[cat] * 100)}%`;
}
