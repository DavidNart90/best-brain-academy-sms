import { describe, expect, it } from "vitest";
import { loginSchema, passwordChangeSchema } from "./schemas";
describe("login validation", () => {
  it("validates credentials without altering passwords or accepting extra role fields", () => {
    expect(
      loginSchema.parse({
        email: "staff@example.invalid",
        password: "  pass  ",
        role: "SUPER_ADMIN",
      }),
    ).toEqual({ email: "staff@example.invalid", password: "  pass  " });
  });
  it.each([
    { email: "broken", password: "x" },
    { email: "staff@example.invalid", password: "" },
    { email: "staff@example.invalid", password: "x".repeat(129) },
  ])("rejects invalid input", (input) =>
    expect(loginSchema.safeParse(input).success).toBe(false),
  );
});

describe("password change validation", () => {
  it("accepts a strong new password that differs from the current one and matches confirmation", () => {
    expect(
      passwordChangeSchema.parse({
        currentPassword: "Temp1234!",
        newPassword: "NewStrong1!",
        confirmPassword: "NewStrong1!",
      }),
    ).toEqual({
      currentPassword: "Temp1234!",
      newPassword: "NewStrong1!",
      confirmPassword: "NewStrong1!",
    });
  });

  it("rejects a new password matching the current password", () => {
    const result = passwordChangeSchema.safeParse({
      currentPassword: "NewStrong1!",
      newPassword: "NewStrong1!",
      confirmPassword: "NewStrong1!",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["newPassword"]);
    }
  });

  it("rejects a confirmation that does not match the new password", () => {
    const result = passwordChangeSchema.safeParse({
      currentPassword: "Temp1234!",
      newPassword: "NewStrong1!",
      confirmPassword: "Mismatch1!",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["confirmPassword"]);
    }
  });

  it("rejects a weak new password", () => {
    expect(
      passwordChangeSchema.safeParse({
        currentPassword: "Temp1234!",
        newPassword: "weak",
        confirmPassword: "weak",
      }).success,
    ).toBe(false);
  });
});
