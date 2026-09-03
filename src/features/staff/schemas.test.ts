import { describe, expect, it } from "vitest";
import { assignmentDetailsSchema, staffInputSchema } from "./schemas";

const person = {
  fullName: "Synthetic Teacher Example",
  staffType: "teaching",
  position: "Teacher",
  status: "active",
};
const assignment = {
  academicYearId: 1,
  academicTermId: 1,
  classId: 5,
  startedOn: "2026-09-08",
  assignmentKind: "teaching",
  subjectName: "Maths",
};
describe("staff known-details onboarding", () => {
  it("keeps unknown details absent and source name order intact", () => {
    const result = staffInputSchema.parse(person);
    expect(result.fullName).toBe(person.fullName);
    expect([
      result.firstName,
      result.lastName,
      result.phone,
      result.email,
      result.dateJoined,
      result.staffNumber,
    ]).toEqual([null, null, null, null, null, null]);
  });
  it("retains the exact approved ID casing and permits more than three digits", () => {
    expect(
      staffInputSchema.parse({ ...person, staffNumber: " BBS-Staff-1000 " })
        .staffNumber,
    ).toBe("BBS-Staff-1000");
    expect(
      staffInputSchema.safeParse({ ...person, staffNumber: "BBS-STAFF-001" })
        .success,
    ).toBe(false);
  });
  it("still requires an actual name and validates supplied contacts", () => {
    expect(
      staffInputSchema.safeParse({ ...person, fullName: " " }).success,
    ).toBe(false);
    expect(
      staffInputSchema.safeParse({ ...person, phone: "N/A" }).success,
    ).toBe(false);
    expect(
      staffInputSchema.safeParse({ ...person, email: "unknown" }).success,
    ).toBe(false);
    expect(
      staffInputSchema.parse({
        ...person,
        fullName: "",
        firstName: "Synthetic",
        lastName: "Person",
      }).firstName,
    ).toBe("Synthetic");
  });
  it("preserves explicit subject/class pairs rather than a cross product", () => {
    const result = staffInputSchema.parse({
      ...person,
      assignments: [
        assignment,
        { ...assignment, classId: 6, subjectName: "Science" },
      ],
    });
    expect(
      result.assignments.map((row) => [row.classId, row.subjectName]),
    ).toEqual([
      [5, "Maths"],
      [6, "Science"],
    ]);
  });
  it("stores known specialist subjects without guessing their classes", () => {
    const result = staffInputSchema.parse({
      ...person,
      knownSubjects: "Maths; Science; Computing",
    });
    expect(result.knownSubjects).toEqual(["Maths", "Science", "Computing"]);
    expect(result.assignments).toEqual([]);
  });
  it("requires a teaching subject and keeps headship separate", () => {
    expect(
      assignmentDetailsSchema.safeParse({ ...assignment, subjectName: "" })
        .success,
    ).toBe(false);
    expect(
      assignmentDetailsSchema.safeParse({
        ...assignment,
        assignmentKind: "head",
      }).success,
    ).toBe(false);
    expect(
      assignmentDetailsSchema.parse({
        ...assignment,
        assignmentKind: "head",
        subjectName: "",
      }).subjectName,
    ).toBeNull();
    expect(
      assignmentDetailsSchema.parse({
        ...assignment,
        subjectName: "All subjects",
      }).subjectName,
    ).toBe("All subjects");
  });
  it("rejects duplicate subjects and duplicate class/role/subject pairs", () => {
    expect(
      staffInputSchema.safeParse({
        ...person,
        knownSubjects: ["Maths", "maths"],
      }).success,
    ).toBe(false);
    expect(
      staffInputSchema.safeParse({
        ...person,
        assignments: [assignment, { ...assignment, subjectName: "maths" }],
      }).success,
    ).toBe(false);
  });
  it("does not assign non-teaching or inactive staff to classes", () => {
    expect(
      staffInputSchema.safeParse({
        ...person,
        staffType: "non_teaching",
        knownSubjects: ["Maths"],
      }).success,
    ).toBe(false);
    expect(
      staffInputSchema.safeParse({
        ...person,
        staffType: "non_teaching",
        assignments: [assignment],
      }).success,
    ).toBe(false);
    expect(
      staffInputSchema.safeParse({
        ...person,
        status: "inactive",
        assignments: [assignment],
      }).success,
    ).toBe(false);
  });
  it("requires real dates rather than date-shaped strings", () => {
    expect(
      assignmentDetailsSchema.safeParse({
        ...assignment,
        startedOn: "2026-02-30",
      }).success,
    ).toBe(false);
    expect(
      assignmentDetailsSchema.safeParse({ ...assignment, startedOn: "" })
        .success,
    ).toBe(false);
    expect(
      staffInputSchema.safeParse({ ...person, dateJoined: "2026-13-01" })
        .success,
    ).toBe(false);
  });
});
