import { describe, expect, it } from "vitest";
import {
  FREE_TIER_LIMITS,
  PAID_TIER_LIMITS,
  evaluateStudyGuideLimit,
  isPaidSubscriber,
  canUseAiTutor,
  canUseTtsRationales,
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
    expect(canUseTtsRationales("active")).toBe(true);
    expect(canUseTtsRationales("free")).toBe(false);
  });

  it("allows generous study guides for paid within monthly cap", () => {
    const result = evaluateStudyGuideLimit("active", {
      total: 100,
      createdThisWeek: 50,
      createdThisMonth: PAID_TIER_LIMITS.studyGuidesPerMonth - 1,
    });
    expect(result.allowed).toBe(true);
  });

  it("caps paid tier study guides by monthly rate", () => {
    const result = evaluateStudyGuideLimit("active", {
      total: 100,
      createdThisWeek: 0,
      createdThisMonth: PAID_TIER_LIMITS.studyGuidesPerMonth,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain(String(PAID_TIER_LIMITS.studyGuidesPerMonth));
  });

  it("caps free tier study guides by total count", () => {
    const result = evaluateStudyGuideLimit("free", {
      total: FREE_TIER_LIMITS.maxStudyGuides,
      createdThisWeek: 0,
      createdThisMonth: 0,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("3");
  });

  it("caps free tier study guides by weekly rate", () => {
    const result = evaluateStudyGuideLimit("free", {
      total: 1,
      createdThisWeek: FREE_TIER_LIMITS.studyGuidesPerWeek,
      createdThisMonth: 0,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("week");
  });

  it("allows free tier within limits", () => {
    const result = evaluateStudyGuideLimit("free", {
      total: 2,
      createdThisWeek: 0,
      createdThisMonth: 0,
    });
    expect(result.allowed).toBe(true);
  });
});
