import { describe, expect, it } from "vitest";
import { loginSchema } from "./schemas";
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
