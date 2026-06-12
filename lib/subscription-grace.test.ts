import { describe, expect, it } from "vitest";
import { hasPremiumAccess, isWithinPastDueGrace, PAST_DUE_GRACE_DAYS } from "./subscription-grace";

describe("subscription-grace", () => {
  it("grants grace within window", () => {
    const now = new Date("2026-06-11T12:00:00Z");
    const pastDueAt = new Date("2026-06-09T12:00:00Z").toISOString();
    expect(isWithinPastDueGrace(pastDueAt, now)).toBe(true);
    expect(hasPremiumAccess("past_due", pastDueAt, now)).toBe(true);
  });

  it("denies grace after window", () => {
    const now = new Date("2026-06-11T12:00:00Z");
    const pastDueAt = new Date(
      now.getTime() - (PAST_DUE_GRACE_DAYS + 1) * 24 * 60 * 60 * 1000
    ).toISOString();
    expect(hasPremiumAccess("past_due", pastDueAt, now)).toBe(false);
  });

  it("active always has premium", () => {
    expect(hasPremiumAccess("active", null)).toBe(true);
  });
});
