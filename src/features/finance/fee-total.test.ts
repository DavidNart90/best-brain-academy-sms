import { describe, expect, it } from "vitest";
import { feeTotal } from "./fee-total";

describe("fee schedule totals", () => {
  it("matches the approved JHS and Basic 4 transport totals", () => {
    expect(feeTotal("207.00", "1625.00")).toBe("1832.00");
    expect(feeTotal("150.00", "1625.00")).toBe("1775.00");
  });
  it("preserves cents without floating-point rounding", () => {
    expect(feeTotal("0.10", "0.20")).toBe("0.30");
  });
  it("does not treat missing configuration as free", () => {
    expect(feeTotal(null, "910.00")).toBeNull();
    expect(feeTotal("120.00", null)).toBeNull();
  });
});
