import { describe, expect, it } from "vitest";
import {
  allocateQuestionCountsByNclexWeight,
  buildDistributionAudit,
  computeCategoryBankShares,
  computeScarcityMultipliers,
  selectStratifiedQuestionIds,
} from "./nclex-distribution";
import { NCLEX_CATEGORIES } from "./constants";

describe("nclex-distribution", () => {
  it("allocates mock-sized sessions to NCLEX weights", () => {
    const allocation = allocateQuestionCountsByNclexWeight(85);
    const total = Object.values(allocation).reduce((sum, n) => sum + n, 0);
    expect(total).toBe(85);
    expect(allocation["Pharmacological and Parenteral Therapies"]).toBeGreaterThan(10);
  });

  it("boosts underrepresented categories in scarcity multipliers", () => {
    const shares = computeCategoryBankShares([
      { category: "Physiological Adaptation" },
      { category: "Physiological Adaptation" },
      { category: "Pharmacological and Parenteral Therapies" },
    ]);
    const scarcity = computeScarcityMultipliers(shares);
    expect(scarcity["Pharmacological and Parenteral Therapies"]).toBeGreaterThan(
      scarcity["Physiological Adaptation"]
    );
  });

  it("selects stratified questions matching allocation", () => {
    const pool = NCLEX_CATEGORIES.flatMap((category, i) =>
      Array.from({ length: 20 + i }, (_, j) => ({ id: `${category}-${j}`, category }))
    );
    const allocation = allocateQuestionCountsByNclexWeight(20);
    const selected = selectStratifiedQuestionIds(pool, allocation, new Set());
    expect(selected).toHaveLength(20);
  });

  it("builds distribution audit rows", () => {
    const rows = buildDistributionAudit(
      [{ category: "Physiological Adaptation", count: 1000 }, { category: "Basic Care and Comfort", count: 32 }],
      1032
    );
    const physio = rows.find((r) => r.category === "Physiological Adaptation");
    expect(physio?.gapPct).toBeGreaterThan(10);
  });
});
