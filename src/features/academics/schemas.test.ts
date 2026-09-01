import { describe, expect, it } from "vitest";
import {
  academicTermInputSchema,
  academicYearInputSchema,
  classInputSchema,
  schoolSettingsInputSchema,
} from "./schemas";

describe("academic configuration schemas", () => {
  it("accepts a configurable academic year", () => {
    expect(
      academicYearInputSchema.parse({
        name: "2026/2027",
        shortName: "26/27",
        startsOn: "2026-09-01",
        endsOn: "2027-08-31",
        status: "active",
      }),
    ).toMatchObject({ name: "2026/2027", shortName: "26/27" });
  });

  it("rejects reversed academic-year dates", () => {
    expect(
      academicYearInputSchema.safeParse({
        name: "2026/2027",
        shortName: "26/27",
        startsOn: "2027-08-31",
        endsOn: "2026-09-01",
        status: "active",
      }).success,
    ).toBe(false);
  });

  it("allows an unscheduled term but rejects a half-scheduled term", () => {
    expect(
      academicTermInputSchema.parse({
        academicYearId: 1,
        name: "Term 2",
        sequence: 2,
        startsOn: "",
        endsOn: "",
        status: "active",
      }),
    ).toMatchObject({ startsOn: null, endsOn: null });
    expect(
      academicTermInputSchema.safeParse({
        academicYearId: 1,
        name: "Term 2",
        sequence: 2,
        startsOn: "2027-01-04",
        endsOn: "",
        status: "active",
      }).success,
    ).toBe(false);
  });

  it("normalizes class codes and enforces known class groups", () => {
    expect(
      classInputSchema.parse({
        code: "bas7",
        name: "Basic 7",
        classGroup: "upper_basic",
        sortOrder: 140,
        status: "active",
      }).code,
    ).toBe("BAS7");
    expect(
      classInputSchema.safeParse({
        code: "BAS7",
        name: "Basic 7",
        classGroup: "secondary",
        sortOrder: 140,
      }).success,
    ).toBe(false);
  });

  it("keeps optional school contact fields nullable", () => {
    expect(
      schoolSettingsInputSchema.parse({
        schoolName: "Best Brain Academy",
        shortName: "BBA",
        address: "",
        phone: "",
        email: "",
        motto: "SERVICE WITH DILIGENCE",
        locationChargeLabel: "Location / Transport",
      }),
    ).toMatchObject({ address: null, phone: null, email: null });
  });
});
