import { describe, expect, it } from "vitest";
import { shuffle } from "./missed-questions";

describe("missed-questions", () => {
  it("shuffle preserves elements", () => {
    const input = ["a", "b", "c", "d"];
    const out = shuffle(input);
    expect(out.sort()).toEqual(input.sort());
  });
});
