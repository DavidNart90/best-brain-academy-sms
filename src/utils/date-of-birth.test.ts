import { describe, expect, it } from "vitest";
import { dateOfBirthToIso, formatDateOfBirth } from "./date-of-birth";

describe("date-of-birth formatting", () => {
  it("normalizes the project display format to the database date format", () => {
    expect(dateOfBirthToIso("12-04-2015")).toBe("2015-04-12");
  });

  it("formats stored dates as DD-MM-YYYY", () => {
    expect(formatDateOfBirth("2015-04-12")).toBe("12-04-2015");
  });

  it("rejects impossible calendar dates", () => {
    expect(dateOfBirthToIso("31-02-2015")).toBeNull();
    expect(dateOfBirthToIso("29-02-2023")).toBeNull();
    expect(dateOfBirthToIso("29-02-2024")).toBe("2024-02-29");
  });
});
