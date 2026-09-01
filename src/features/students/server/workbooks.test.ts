import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const existingStudents = vi.hoisted(() => ({
  admissions: [] as Array<{ admission_number: string }>,
  identities: [] as Array<{
    first_name: string;
    last_name: string;
    date_of_birth: string;
  }>,
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: () => ({
      select: (columns: string) => ({
        in: () => ({
          limit: async () => ({
            data: existingStudents.admissions,
            error: null,
          }),
        }),
        not: () => ({
          limit: async () => ({
            data: existingStudents.identities,
            error: null,
          }),
        }),
        limit: async () => ({
          data: columns.includes("admission_number")
            ? existingStudents.admissions
            : existingStudents.identities,
          error: null,
        }),
      }),
    }),
  })),
}));

import {
  buildStudentExport,
  buildStudentTemplate,
  parseStudentWorkbook,
} from "./workbooks";
import type { StudentDirectoryRow, StudentReferenceData } from "../types";

const reference: StudentReferenceData = {
  academicYears: [{ id: 1, name: "2026/2027", isCurrent: true }],
  academicTerms: [
    {
      id: 1,
      academicYearId: 1,
      name: "Term 1",
      isCurrent: true,
    },
  ],
  classes: [{ id: 5, name: "Basic 1" }],
  locations: [{ id: 2, name: "Asuofori" }],
};

const validRow = [
  "BBA/STU/2026/0001",
  "Akosua",
  "",
  "Mensah",
  "Female",
  "2016-04-12",
  "2026-09-08",
  "Active",
  "2026/2027",
  "Term 1",
  "Basic 1",
  "Asuofori",
  "No",
  "",
  "Pentecostal",
  "Kofi Mensah",
  "Father",
  "0240000000",
  "",
  "",
  "",
  "",
  "",
];

async function workbookFile(rows: unknown[][], workbookReference = reference) {
  const template = await buildStudentTemplate(workbookReference);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Uint8Array.from(template) as unknown as ArrayBuffer);
  const sheet = workbook.getWorksheet("Students");
  if (!sheet) throw new Error("Template Students sheet is missing.");
  rows.forEach((row, index) => {
    row.forEach((value, column) => {
      sheet.getRow(index + 2).getCell(column + 1).value = value as string;
    });
  });
  const output = await workbook.xlsx.writeBuffer();
  const bytes = Uint8Array.from(new Uint8Array(output));
  return {
    name: "students.xlsx",
    size: bytes.byteLength,
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    arrayBuffer: async () => bytes.buffer,
  } as File;
}

beforeEach(() => {
  existingStudents.admissions = [];
  existingStudents.identities = [];
});

describe("student Excel workflow", () => {
  it("builds an approved template with hidden references and input validation", async () => {
    const workbook = new ExcelJS.Workbook();
    const template = await buildStudentTemplate(reference);
    await workbook.xlsx.load(
      Uint8Array.from(template) as unknown as ArrayBuffer,
    );
    expect(workbook.getWorksheet("Instructions")).toBeDefined();
    expect(workbook.getWorksheet("Reference Data")?.state).toBe("veryHidden");
    expect(
      workbook.getWorksheet("Students")?.getCell("K2").dataValidation.type,
    ).toBe("list");
    expect(
      workbook.getWorksheet("Students")?.getCell("M2").dataValidation.type,
    ).toBe("list");
    expect(workbook.getWorksheet("Students")?.getCell("O1").text).toBe(
      "Religious Denomination",
    );
  });

  it("previews a valid row without saving it", async () => {
    const parsed = await parseStudentWorkbook(
      await workbookFile([validRow]),
      reference,
    );
    expect(parsed.preview.rows[0]?.errors).toEqual([]);
    expect(parsed.preview).toMatchObject({
      validCount: 1,
      errorCount: 0,
      duplicateCount: 0,
      canConfirm: true,
    });
    expect(parsed.validRows[0]).toMatchObject({
      admissionNumber: "BBA/STU/2026/0001",
      academicYearId: 1,
      academicTermId: 1,
      classId: 5,
      schoolLocationId: 2,
      hasDisability: false,
      religiousDenomination: "Pentecostal",
    });
  });

  it("requires disability details for rows marked Yes", async () => {
    const row = [...validRow];
    row[12] = "Yes";
    const parsed = await parseStudentWorkbook(
      await workbookFile([row]),
      reference,
    );
    expect(parsed.preview.canConfirm).toBe(false);
    expect(parsed.preview.rows[0]?.errors.join(" ")).toContain(
      "State the disability",
    );
  });

  it("includes disability and denomination in exports", async () => {
    const row: StudentDirectoryRow = {
      id: 1,
      admissionNumber: "BBA/STU/2026/0001",
      fullName: "Akosua Mensah",
      gender: "female",
      admissionDate: "2026-09-08",
      status: "active",
      guardianName: "Kofi Mensah",
      guardianPhone: "0240000000",
      academicYearId: 1,
      academicYearName: "2026/2027",
      academicTermId: 1,
      academicTermName: "Term 1",
      classId: 5,
      className: "Basic 1",
      schoolLocationId: 2,
      schoolLocationName: "Asuofori",
      hasDisability: true,
      disabilityDetails: "Visual impairment",
      religiousDenomination: "Pentecostal",
    };
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(
      Uint8Array.from(
        await buildStudentExport([row]),
      ) as unknown as ArrayBuffer,
    );
    const sheet = workbook.getWorksheet("Students");
    expect(sheet?.getCell("H1").text).toBe("Has Disability");
    expect(sheet?.getCell("H2").text).toBe("Yes");
    expect(sheet?.getCell("I2").text).toBe("Visual impairment");
    expect(sheet?.getCell("J2").text).toBe("Pentecostal");
  });

  it("reports row-level validation and duplicate errors before confirmation", async () => {
    const duplicate = [...validRow];
    duplicate[1] = "Ama";
    const invalid = [...validRow];
    invalid[0] = "BBA/STU/2026/0002";
    invalid[4] = "Unknown";
    invalid[10] = "Missing class";
    const parsed = await parseStudentWorkbook(
      await workbookFile([validRow, duplicate, invalid]),
      reference,
    );
    expect(parsed.preview.canConfirm).toBe(false);
    expect(parsed.preview.duplicateCount).toBe(2);
    expect(parsed.preview.errorCount).toBe(3);
    expect(parsed.validRows).toEqual([]);
    expect(parsed.preview.rows[0]?.errors.join(" ")).toContain(
      "Duplicate admission number",
    );
    expect(parsed.preview.rows[2]?.errors.join(" ")).toMatch(/gender|classId/i);
  });

  it("flags admission numbers already stored in the database", async () => {
    existingStudents.admissions = [{ admission_number: "BBA/STU/2026/0001" }];
    const parsed = await parseStudentWorkbook(
      await workbookFile([validRow]),
      reference,
    );
    expect(parsed.preview).toMatchObject({
      validCount: 0,
      errorCount: 1,
      duplicateCount: 1,
      canConfirm: false,
    });
  });

  it("resolves a repeated term name within the selected academic year", async () => {
    const multiYearReference: StudentReferenceData = {
      ...reference,
      academicYears: [
        ...reference.academicYears,
        { id: 2, name: "2027/2028", isCurrent: false },
      ],
      academicTerms: [
        ...reference.academicTerms,
        {
          id: 9,
          academicYearId: 2,
          name: "Term 1",
          isCurrent: false,
        },
      ],
    };
    const nextYear = [...validRow];
    nextYear[0] = "BBA/STU/2027/0001";
    nextYear[8] = "2027/2028";
    const parsed = await parseStudentWorkbook(
      await workbookFile([nextYear], multiYearReference),
      multiYearReference,
    );
    expect(parsed.validRows[0]).toMatchObject({
      academicYearId: 2,
      academicTermId: 9,
    });
  });
});
