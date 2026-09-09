import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { postingError } from "./posting-error";

describe("finance diagnostics", () => {
  it("logs only operation, error code and a reference without provider data", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = postingError(
      { code: "42702", message: "Private student, amount 500, SQL details" },
      "school_fee_payment",
    );
    expect(result.ok).toBe(false);
    expect(log).toHaveBeenCalledWith("finance_post_failed", {
      operation: "school_fee_payment",
      code: "42702",
      reference: expect.any(String),
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain("Private student");
    expect(result.message).not.toContain("SQL");
    log.mockRestore();
  });
});
