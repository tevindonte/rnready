import { describe, expect, it } from "vitest";
import { computeSessionScore } from "@/lib/session-score";

describe("computeSessionScore", () => {
  it("uses answer rows when stored session totals are stale", () => {
    const score = computeSessionScore(
      8,
      [
        { is_correct: true },
        { is_correct: true },
        { is_correct: true },
        { is_correct: true },
        { is_correct: true },
        { is_correct: true },
        { is_correct: true },
        { is_correct: false },
      ],
      8,
      7
    );

    expect(score).toEqual({ correct: 7, total: 8, percent: 88 });
  });

  it("scores attempted questions when a session ends early", () => {
    const score = computeSessionScore(
      25,
      [
        { is_correct: true },
        { is_correct: true },
        { is_correct: false },
        { is_correct: true },
        { is_correct: true },
      ],
      4,
      25
    );

    expect(score).toEqual({ correct: 4, total: 5, percent: 80 });
  });

  it("falls back to stored values when no answers exist", () => {
    expect(computeSessionScore(0, [], 6, 10)).toEqual({
      correct: 6,
      total: 10,
      percent: 60,
    });
  });
});
