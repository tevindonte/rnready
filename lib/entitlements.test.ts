import { describe, expect, it } from "vitest";
import {
  FREE_TIER_LIMITS,
  evaluateStudyGuideLimit,
  isPaidSubscriber,
  canUseAiTutor,
  canReExplain,
} from "./entitlements";

describe("entitlements", () => {
  it("identifies paid subscribers", () => {
    expect(isPaidSubscriber("active")).toBe(true);
    expect(isPaidSubscriber("free")).toBe(false);
    expect(isPaidSubscriber("cancelled")).toBe(false);
  });

  it("gates per-use AI features to paid only", () => {
    expect(canUseAiTutor("active")).toBe(true);
    expect(canUseAiTutor("free")).toBe(false);
    expect(canReExplain("free")).toBe(false);
  });

  it("allows unlimited study guides for paid", () => {
    const result = evaluateStudyGuideLimit("active", { total: 100, createdThisWeek: 50 });
    expect(result.allowed).toBe(true);
  });

  it("caps free tier study guides by total count", () => {
    const result = evaluateStudyGuideLimit("free", {
      total: FREE_TIER_LIMITS.maxStudyGuides,
      createdThisWeek: 0,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("3");
  });

  it("caps free tier study guides by weekly rate", () => {
    const result = evaluateStudyGuideLimit("free", {
      total: 1,
      createdThisWeek: FREE_TIER_LIMITS.studyGuidesPerWeek,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("week");
  });

  it("allows free tier within limits", () => {
    const result = evaluateStudyGuideLimit("free", { total: 2, createdThisWeek: 0 });
    expect(result.allowed).toBe(true);
  });
});
