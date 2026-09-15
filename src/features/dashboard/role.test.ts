import { describe, expect, it } from "vitest";
import { resolveDashboardVariant } from "./role";

describe("dashboard role composition", () => {
  it.each([
    [["ADMINISTRATOR"], "administrator"],
    [["ACCOUNTANT"], "accountant"],
    [["MANAGEMENT"], "board-member"],
    [["LIBRARIAN"], "librarian"],
    [[], "workspace"],
  ] as const)("maps %j to %s", (roles, expected) => {
    expect(resolveDashboardVariant([...roles])).toBe(expected);
  });

  it("always gives a Super Administrator the combined dashboard", () => {
    expect(
      resolveDashboardVariant(["LIBRARIAN", "ACCOUNTANT", "SUPER_ADMIN"]),
    ).toBe("super-admin");
  });
});
