import { describe, expect, it } from "vitest";
import { getMockOverlapWarnings } from "./mock-overlap";

describe("mock-overlap", () => {
  it("flags high overlap for thin categories", () => {
    const warnings = getMockOverlapWarnings([
      { category: "Basic Care and Comfort", count: 16 },
      { category: "Physiological Adaptation", count: 1000 },
    ]);
    const basic = warnings.find((w) => w.category === "Basic Care and Comfort");
    expect(basic?.overlapRisk).toBe("high");
  });

  it("returns empty when pools are large enough", () => {
    const warnings = getMockOverlapWarnings(
      Array.from({ length: 8 }, (_, i) => ({
        category: [
          "Management of Care",
          "Safety and Infection Control",
          "Pharmacological and Parenteral Therapies",
          "Physiological Adaptation",
          "Reduction of Risk Potential",
          "Basic Care and Comfort",
          "Health Promotion and Maintenance",
          "Psychosocial Integrity",
        ][i],
        count: 500,
      }))
    );
    expect(warnings.filter((w) => w.overlapRisk === "high")).toHaveLength(0);
  });
});
