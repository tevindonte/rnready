import { describe, expect, it } from "vitest";
import { isActiveQuizSession, isNavActive } from "./nav";

describe("nav", () => {
  it("treats /quiz/config as config page, not active session", () => {
    expect(isActiveQuizSession("/quiz/config")).toBe(false);
  });

  it("detects active quiz sessions", () => {
    expect(isActiveQuizSession("/quiz/guest")).toBe(true);
    expect(isActiveQuizSession("/quiz/550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isActiveQuizSession("/quiz/550e8400-e29b-41d4-a716-446655440000/review")).toBe(false);
  });

  it("does not double-highlight study guide routes", () => {
    expect(isNavActive("/study-guides", "/study-guide")).toBe(false);
    expect(isNavActive("/study-guides", "/study-guides")).toBe(true);
    expect(isNavActive("/study-guide", "/study-guide")).toBe(true);
  });
});
