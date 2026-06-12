import { describe, expect, it, afterEach } from "vitest";
import { isAdminEmail } from "./admin";

describe("admin", () => {
  const original = process.env.ADMIN_EMAILS;

  afterEach(() => {
    if (original === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = original;
  });

  it("matches configured admin emails", () => {
    process.env.ADMIN_EMAILS = "admin@test.com, other@test.com";
    expect(isAdminEmail("Admin@Test.com")).toBe(true);
    expect(isAdminEmail("nope@test.com")).toBe(false);
  });

  it("returns false when unset", () => {
    delete process.env.ADMIN_EMAILS;
    expect(isAdminEmail("any@test.com")).toBe(false);
  });
});
