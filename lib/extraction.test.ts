import { describe, expect, it } from "vitest";
import { parseQuestionStyle, resolveQuestionStyleTag } from "@/lib/extraction";

describe("question style helpers", () => {
  it("defaults invalid values to mixed", () => {
    expect(parseQuestionStyle(undefined)).toBe("mixed");
    expect(parseQuestionStyle("invalid")).toBe("mixed");
  });

  it("forces style tag for non-mixed modes", () => {
    expect(resolveQuestionStyleTag("nclex_scenario", {})).toBe("nclex_scenario");
    expect(resolveQuestionStyleTag("direct_recall", {})).toBe("direct_recall");
  });

  it("uses per-question style in mixed mode", () => {
    expect(
      resolveQuestionStyleTag("mixed", { question_style: "direct_recall" })
    ).toBe("direct_recall");
    expect(resolveQuestionStyleTag("mixed", {})).toBeNull();
  });
});
