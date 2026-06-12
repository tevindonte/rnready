import { describe, expect, it } from "vitest";
import { captureClientException, captureServerException } from "./monitoring";

describe("monitoring", () => {
  it("captureServerException does not throw", async () => {
    await expect(captureServerException(new Error("test"), { route: "/api/test" })).resolves.toBeUndefined();
  });

  it("captureClientException does not throw", () => {
    expect(() => captureClientException(new Error("test"))).not.toThrow();
  });
});
