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

  it("returns the reviewed admission reconciliation guidance", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const message =
      "Admission fees do not match 10 admissions for 2026-09-23. Expected GHS 500.00 at GHS 50.00 each. Contact the Administrator to check the admissions count for this date.";
    expect(
      postingError({ code: "22023", message }, "admission_receipt").message,
    ).toBe(message);
    expect(
      postingError(
        { code: "22023", message: "Private SQL details" },
        "admission_receipt",
      ).message,
    ).not.toContain("Private SQL details");
    log.mockRestore();
  });
});
