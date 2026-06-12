import { describe, expect, it } from "vitest";
import { isValidFeedbackReason } from "./question-feedback";

describe("question-feedback", () => {
  it("validates feedback reasons", () => {
    expect(isValidFeedbackReason("formatting")).toBe(true);
    expect(isValidFeedbackReason("wrong_answer")).toBe(true);
    expect(isValidFeedbackReason("bad_explanation")).toBe(true);
    expect(isValidFeedbackReason("invalid")).toBe(false);
  });
});
