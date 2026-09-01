import { describe, expect, it } from "vitest";
import {
  enrollmentChangeSchema,
  guardianLinkSchema,
  studentInputSchema,
  studentListQuerySchema,
} from "./schemas";

const validStudent = {
  admissionNumber: "bba/stu/2026/0001",
  firstName: "  Akosua ",
  middleName: "",
  lastName: "Mensah",
  gender: "female",
  dateOfBirth: "2015-04-12",
  admissionDate: "2026-09-08",
  status: "active",
  hasDisability: "no",
  disabilityDetails: "",
  religiousDenomination: "Pentecostal",
  previousSchool: "",
  notes: "",
  guardianName: "Kofi Mensah",
  guardianRelationship: "Father",
  guardianPhone: "0240000000",
  guardianAlternativePhone: "",
  guardianEmail: "",
  guardianAddress: "",
  academicYearId: "1",
  academicTermId: "1",
  classId: "5",
  schoolLocationId: "2",
};

describe("studentInputSchema", () => {
  it("normalizes a valid onboarding record", () => {
    const result = studentInputSchema.parse(validStudent);
    expect(result.admissionNumber).toBe("BBA/STU/2026/0001");
    expect(result.firstName).toBe("Akosua");
    expect(result.middleName).toBeNull();
    expect(result.guardianEmail).toBeNull();
    expect(result.hasDisability).toBe(false);
    expect(result.disabilityDetails).toBeNull();
    expect(result.classId).toBe(5);
    expect(studentInputSchema.parse(result)).toEqual(result);
  });

  it("rejects invalid identifiers and impossible dates", () => {
    const result = studentInputSchema.safeParse({
      ...validStudent,
      admissionNumber: "bad number",
      dateOfBirth: "2027-01-01",
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues.map((issue) => issue.path[0])).toEqual(
        expect.arrayContaining(["admissionNumber", "dateOfBirth"]),
      );
  });

  it("requires disability details when Yes is selected", () => {
    const result = studentInputSchema.safeParse({
      ...validStudent,
      hasDisability: "yes",
      disabilityDetails: "",
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues.map((issue) => issue.path[0])).toContain(
        "disabilityDetails",
      );
  });
});

describe("studentListQuerySchema", () => {
  it("bounds malformed URL state to safe defaults", () => {
    expect(
      studentListQuerySchema.parse({
        q: "x".repeat(100),
        page: "-3",
        status: "unknown",
        sort: "unknown",
      }),
    ).toMatchObject({ q: "", page: 1, status: "active", sort: "name" });
  });
});

describe("student profile write schemas", () => {
  it("validates and normalizes a guardian link", () => {
    expect(
      guardianLinkSchema.parse({
        studentId: "4",
        fullName: "  Abena Mensah ",
        relationship: "Mother",
        primaryPhone: "0240000001",
        alternativePhone: "",
        email: "",
        address: "",
        isPrimary: true,
      }),
    ).toMatchObject({ studentId: 4, fullName: "Abena Mensah", email: null });
  });

  it("rejects incomplete enrollment changes", () => {
    expect(
      enrollmentChangeSchema.safeParse({
        studentId: 1,
        academicYearId: 1,
        academicTermId: 0,
        classId: 1,
        schoolLocationId: 1,
        startedOn: "not-a-date",
      }).success,
    ).toBe(false);
  });
});
