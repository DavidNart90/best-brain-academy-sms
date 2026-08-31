import { describe, expect, it } from "vitest";
import { formatMoney } from "./money";

describe("exact GHS presentation", () => {
  it.each([
    ["1250.00", "GHS 1,250.00"],
    ["0.01", "GHS 0.01"],
    ["-250.50", "-GHS 250.50"],
    ["-0.00", "GHS 0.00"],
    ["999999999999.99", "GHS 999,999,999,999.99"],
  ])("formats %s without float conversion", (input, expected) =>
    expect(formatMoney(input)).toBe(expected),
  );
  it.each([
    "1.005",
    "12",
    "NaN",
    "1e3",
    "1000000000000.00",
    "01.00",
    "1,000.00",
  ])("rejects noncanonical or overflowing input %s", (value) =>
    expect(() => formatMoney(value)).toThrow(),
  );
});
