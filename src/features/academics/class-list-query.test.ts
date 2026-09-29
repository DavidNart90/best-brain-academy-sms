import { describe, expect, it } from "vitest";
import { aggregateClassGenderCounts, classListHref } from "./class-list-query";

describe("class list query", () => {
  it("preserves the academic context in page and print links", () => {
    const query = {
      q: "Basic",
      status: "all" as const,
      academicYearId: 2,
      academicTermId: 5,
    };

    expect(classListHref(query, { page: 3 })).toBe(
      "/classes?q=Basic&status=all&academicYearId=2&academicTermId=5&page=3",
    );
    expect(classListHref(query, { pathname: "/classes/print" })).toBe(
      "/classes/print?q=Basic&status=all&academicYearId=2&academicTermId=5",
    );
  });

  it("counts each student once using their latest selected-period enrollment", () => {
    const result = aggregateClassGenderCounts([
      { enrollmentId: 1, classId: 1, studentId: 10, gender: "male" },
      { enrollmentId: 2, classId: 1, studentId: 11, gender: "female" },
      { enrollmentId: 3, classId: 2, studentId: 12, gender: "female" },
      { enrollmentId: 4, classId: 2, studentId: 10, gender: "male" },
    ]);

    expect(result.get(1)).toEqual({
      femaleStudents: 1,
      maleStudents: 0,
      totalStudents: 1,
    });
    expect(result.get(2)).toEqual({
      femaleStudents: 1,
      maleStudents: 1,
      totalStudents: 2,
    });
  });
});
