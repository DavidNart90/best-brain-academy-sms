import "server-only";

import ExcelJS from "exceljs";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import {
  studentInputSchema,
  studentStatuses,
  type StudentInput,
} from "../schemas";
import type {
  ImportPreview,
  ImportPreviewRow,
  StudentDirectoryRow,
  StudentReferenceData,
} from "../types";

const MAX_IMPORT_ROWS = 250;
const importHeaders = [
  "Admission Number",
  "First Name",
  "Middle Name",
  "Last Name",
  "Gender",
  "Date of Birth",
  "Admission Date",
  "Status",
  "Academic Year",
  "Term",
  "Class",
  "Student Location",
  "Has Disability",
  "Disability Details",
  "Religious Denomination",
  "Guardian Name",
  "Guardian Relationship",
  "Guardian Phone",
  "Alternative Phone",
  "Guardian Email",
  "Guardian Address",
  "Previous School",
  "Notes",
] as const;

type ParsedWorkbook = {
  preview: ImportPreview;
  validRows: StudentInput[];
};

function normalizedLookup(values: Array<{ id: number; name: string }>) {
  return new Map(
    values.map((value) => [value.name.trim().toLowerCase(), value.id]),
  );
}

function textValue(cell: ExcelJS.Cell) {
  if (cell.value === null || cell.value === undefined) return "";
  if (typeof cell.value === "object" && "result" in cell.value)
    return String(cell.value.result ?? "").trim();
  return cell.text.trim();
}

function dateValue(cell: ExcelJS.Cell) {
  if (cell.value instanceof Date) return cell.value.toISOString().slice(0, 10);
  const value = textValue(cell);
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf())
    ? value
    : parsed.toISOString().slice(0, 10);
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function safeSpreadsheetText(value: string) {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

export async function buildStudentTemplate(reference: StudentReferenceData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Best Brain Academy";
  workbook.created = new Date();
  const instructions = workbook.addWorksheet("Instructions", {
    views: [{ showGridLines: false }],
  });
  instructions.columns = [{ width: 26 }, { width: 82 }];
  instructions.addRows([
    [
      "Student import template",
      "Complete the Students sheet, then preview it in the application before confirming.",
    ],
    [
      "Required",
      "Admission Number, First Name, Last Name, Gender, Admission Date, Status, Academic Year, Term, Class, Student Location, Has Disability, Religious Denomination, Guardian Name, Guardian Relationship and Guardian Phone.",
    ],
    ["Dates", "Use YYYY-MM-DD. Date of Birth is optional."],
    [
      "Disability",
      "Choose Yes or No. When Yes is selected, Disability Details is required.",
    ],
    [
      "Limit",
      `Import up to ${MAX_IMPORT_ROWS} students at a time. Every row must pass validation before anything is saved.`,
    ],
    [
      "Duplicates",
      "Admission numbers must be unique. Matching name and date of birth are also flagged for review.",
    ],
  ]);
  instructions.getRow(1).font = {
    bold: true,
    size: 15,
    color: { argb: "FF1F2328" },
  };
  instructions.getColumn(1).font = { bold: true, color: { argb: "FF475467" } };
  instructions.eachRow((row) => {
    row.alignment = { vertical: "top", wrapText: true };
  });

  const students = workbook.addWorksheet("Students", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: false }],
  });
  students.addRow([...importHeaders]);
  students.getRow(1).height = 28;
  students.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  students.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFBD3B36" },
  };
  students.getRow(1).alignment = { vertical: "middle" };
  const widths = [
    20, 18, 18, 18, 12, 16, 16, 14, 18, 14, 18, 24, 16, 32, 24, 24, 22, 18, 18,
    24, 28, 24, 34,
  ];
  students.columns.forEach((column, index) => {
    column.width = widths[index];
  });
  students.autoFilter = { from: "A1", to: "W1" };

  const referenceSheet = workbook.addWorksheet("Reference Data");
  referenceSheet.state = "veryHidden";
  referenceSheet.addRow([
    "Academic Years",
    "Terms",
    "Classes",
    "Locations",
    "Gender",
    "Status",
    "Has Disability",
  ]);
  const longest = Math.max(
    reference.academicYears.length,
    reference.academicTerms.length,
    reference.classes.length,
    reference.locations.length,
    4,
  );
  for (let index = 0; index < longest; index += 1) {
    referenceSheet.addRow([
      reference.academicYears[index]?.name ?? "",
      reference.academicTerms[index]?.name ?? "",
      reference.classes[index]?.name ?? "",
      reference.locations[index]?.name ?? "",
      ["Female", "Male"][index] ?? "",
      ["Active", "Inactive", "Graduated", "Withdrawn"][index] ?? "",
      ["Yes", "No"][index] ?? "",
    ]);
  }
  const validationRanges = {
    E: "'Reference Data'!$E$2:$E$3",
    H: "'Reference Data'!$F$2:$F$5",
    I: `'Reference Data'!$A$2:$A$${reference.academicYears.length + 1}`,
    J: `'Reference Data'!$B$2:$B$${reference.academicTerms.length + 1}`,
    K: `'Reference Data'!$C$2:$C$${reference.classes.length + 1}`,
    L: `'Reference Data'!$D$2:$D$${reference.locations.length + 1}`,
    M: "'Reference Data'!$G$2:$G$3",
  };
  for (let row = 2; row <= MAX_IMPORT_ROWS + 1; row += 1) {
    for (const [column, formula] of Object.entries(validationRanges)) {
      students.getCell(`${column}${row}`).dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: [formula],
        showErrorMessage: true,
        errorTitle: "Choose a listed value",
        error: "Use one of the values in the dropdown.",
      };
    }
    students.getCell(`F${row}`).numFmt = "yyyy-mm-dd";
    students.getCell(`G${row}`).numFmt = "yyyy-mm-dd";
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function parseStudentWorkbook(
  file: File,
  reference: StudentReferenceData,
): Promise<ParsedWorkbook> {
  const workbook = new ExcelJS.Workbook();
  const workbookBytes = new Uint8Array(await file.arrayBuffer());
  await workbook.xlsx.load(workbookBytes as unknown as ArrayBuffer);
  const sheet = workbook.getWorksheet("Students") ?? workbook.worksheets[0];
  if (!sheet) throw new Error("The workbook does not contain a worksheet.");
  const headerByName = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, column) => {
    headerByName.set(normalizeHeader(textValue(cell)), column);
  });
  const missingHeaders = importHeaders.filter(
    (header) => !headerByName.has(normalizeHeader(header)),
  );
  if (missingHeaders.length > 0)
    throw new Error(`Missing columns: ${missingHeaders.join(", ")}.`);

  const yearLookup = normalizedLookup(reference.academicYears);
  const termLookup = new Map(
    reference.academicTerms.map((term) => [
      `${term.academicYearId}|${term.name.trim().toLowerCase()}`,
      term.id,
    ]),
  );
  const classLookup = normalizedLookup(reference.classes);
  const locationLookup = normalizedLookup(reference.locations);
  const rawRows: Array<{
    rowNumber: number;
    parsed: StudentInput | null;
    preview: ImportPreviewRow;
  }> = [];

  const cell = (row: ExcelJS.Row, header: (typeof importHeaders)[number]) =>
    row.getCell(headerByName.get(normalizeHeader(header)) ?? 0);
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    if (importHeaders.every((header) => !textValue(cell(row, header))))
      continue;
    if (rawRows.length >= MAX_IMPORT_ROWS)
      throw new Error(`Import up to ${MAX_IMPORT_ROWS} students at a time.`);
    const academicYear = textValue(cell(row, "Academic Year"));
    const academicTerm = textValue(cell(row, "Term"));
    const className = textValue(cell(row, "Class"));
    const schoolLocation = textValue(cell(row, "Student Location"));
    const hasDisability = textValue(cell(row, "Has Disability")).toLowerCase();
    const disabilityDetails = textValue(cell(row, "Disability Details"));
    const religiousDenomination = textValue(
      cell(row, "Religious Denomination"),
    );
    const academicYearId = yearLookup.get(academicYear.toLowerCase());
    const input = {
      admissionNumber: textValue(cell(row, "Admission Number")),
      firstName: textValue(cell(row, "First Name")),
      middleName: textValue(cell(row, "Middle Name")),
      lastName: textValue(cell(row, "Last Name")),
      gender: textValue(cell(row, "Gender")).toLowerCase(),
      dateOfBirth: dateValue(cell(row, "Date of Birth")),
      admissionDate: dateValue(cell(row, "Admission Date")),
      status: textValue(cell(row, "Status")).toLowerCase(),
      hasDisability,
      disabilityDetails,
      religiousDenomination,
      previousSchool: textValue(cell(row, "Previous School")),
      notes: textValue(cell(row, "Notes")),
      guardianName: textValue(cell(row, "Guardian Name")),
      guardianRelationship: textValue(cell(row, "Guardian Relationship")),
      guardianPhone: textValue(cell(row, "Guardian Phone")),
      guardianAlternativePhone: textValue(cell(row, "Alternative Phone")),
      guardianEmail: textValue(cell(row, "Guardian Email")).toLowerCase(),
      guardianAddress: textValue(cell(row, "Guardian Address")),
      academicYearId,
      academicTermId: academicYearId
        ? termLookup.get(`${academicYearId}|${academicTerm.toLowerCase()}`)
        : undefined,
      classId: classLookup.get(className.toLowerCase()),
      schoolLocationId: locationLookup.get(schoolLocation.toLowerCase()),
    };
    const parsed = studentInputSchema.safeParse(input);
    const errors = parsed.success
      ? []
      : parsed.error.issues.map(
          (issue) => `${String(issue.path[0] ?? "Row")}: ${issue.message}`,
        );
    rawRows.push({
      rowNumber,
      parsed: parsed.success ? parsed.data : null,
      preview: {
        rowNumber,
        values: {
          admissionNumber: String(input.admissionNumber).toUpperCase(),
          firstName: String(input.firstName),
          middleName: String(input.middleName) || null,
          lastName: String(input.lastName),
          gender: input.gender === "male" ? "male" : "female",
          admissionDate: String(input.admissionDate),
          status: studentStatuses.includes(
            input.status as (typeof studentStatuses)[number],
          )
            ? (input.status as StudentInput["status"])
            : "active",
          academicYear,
          academicTerm,
          className,
          schoolLocation,
          hasDisability:
            hasDisability === "yes"
              ? disabilityDetails
                ? `Yes — ${disabilityDetails}`
                : "Yes"
              : hasDisability === "no"
                ? "No"
                : hasDisability,
          disabilityDetails: disabilityDetails || null,
          religiousDenomination,
        },
        errors,
      },
    });
  }
  if (rawRows.length === 0)
    throw new Error("The Students sheet does not contain any records.");

  const admissionRows = new Map<string, number[]>();
  const identityRows = new Map<string, number[]>();
  for (const row of rawRows) {
    if (!row.parsed) continue;
    const admission = row.parsed.admissionNumber;
    admissionRows.set(admission, [
      ...(admissionRows.get(admission) ?? []),
      row.rowNumber,
    ]);
    if (row.parsed.dateOfBirth) {
      const identity = `${row.parsed.firstName.toLowerCase()}|${row.parsed.lastName.toLowerCase()}|${row.parsed.dateOfBirth}`;
      identityRows.set(identity, [
        ...(identityRows.get(identity) ?? []),
        row.rowNumber,
      ]);
    }
  }
  for (const [admission, rows] of admissionRows)
    if (rows.length > 1)
      for (const rowNumber of rows)
        rawRows
          .find((row) => row.rowNumber === rowNumber)
          ?.preview.errors.push(
            `Duplicate admission number ${admission} in this file.`,
          );
  for (const rows of identityRows.values())
    if (rows.length > 1)
      for (const rowNumber of rows)
        rawRows
          .find((row) => row.rowNumber === rowNumber)
          ?.preview.errors.push(
            "Possible duplicate name and date of birth in this file.",
          );

  const validRows = rawRows.flatMap((row) => (row.parsed ? [row.parsed] : []));
  const supabase = await createServerSupabaseClient();
  const [existingAdmissions, existingIdentities] = await Promise.all([
    validRows.length
      ? supabase
          .from("students")
          .select("admission_number")
          .in(
            "admission_number",
            validRows.map((row) => row.admissionNumber),
          )
          .limit(MAX_IMPORT_ROWS)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("students")
      .select("first_name,last_name,date_of_birth")
      .not("date_of_birth", "is", null)
      .limit(5000),
  ]);
  if (existingAdmissions.error || existingIdentities.error)
    throw new Error("Existing students could not be checked for duplicates.");
  const admissionSet = new Set(
    existingAdmissions.data.map((row) => row.admission_number.toUpperCase()),
  );
  const identitySet = new Set(
    existingIdentities.data.map(
      (row) =>
        `${row.first_name.toLowerCase()}|${row.last_name.toLowerCase()}|${row.date_of_birth}`,
    ),
  );
  for (const row of rawRows) {
    if (!row.parsed) continue;
    if (admissionSet.has(row.parsed.admissionNumber))
      row.preview.errors.push("Duplicate: admission number already exists.");
    if (
      row.parsed.dateOfBirth &&
      identitySet.has(
        `${row.parsed.firstName.toLowerCase()}|${row.parsed.lastName.toLowerCase()}|${row.parsed.dateOfBirth}`,
      )
    )
      row.preview.errors.push(
        "Possible duplicate: name and date of birth already exist.",
      );
  }
  const duplicateCount = rawRows.filter((row) =>
    row.preview.errors.some((error) =>
      error.toLowerCase().includes("duplicate"),
    ),
  ).length;
  const errorCount = rawRows.filter(
    (row) => row.preview.errors.length > 0,
  ).length;
  return {
    preview: {
      fileName: file.name,
      rows: rawRows.map((row) => row.preview),
      validCount: rawRows.length - errorCount,
      errorCount,
      duplicateCount,
      canConfirm: errorCount === 0,
    },
    validRows: errorCount === 0 ? validRows : [],
  };
}

export async function importStudentRows(rows: StudentInput[]) {
  const supabase = await createServerSupabaseClient();
  const result = await supabase.rpc("import_students", {
    payload: rows as unknown as Json,
  });
  if (result.error) throw result.error;
  const data = result.data as { createdCount?: unknown } | null;
  return Number(data?.createdCount ?? 0);
}

export async function buildStudentExport(rows: StudentDirectoryRow[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Best Brain Academy";
  const sheet = workbook.addWorksheet("Students", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: false }],
  });
  sheet.columns = [
    { header: "Admission Number", key: "admission", width: 22 },
    { header: "Student Name", key: "name", width: 28 },
    { header: "Gender", key: "gender", width: 12 },
    { header: "Class", key: "className", width: 18 },
    { header: "Academic Year", key: "year", width: 18 },
    { header: "Term", key: "term", width: 14 },
    { header: "Student Location", key: "location", width: 24 },
    { header: "Has Disability", key: "hasDisability", width: 16 },
    { header: "Disability Details", key: "disabilityDetails", width: 34 },
    {
      header: "Religious Denomination",
      key: "religiousDenomination",
      width: 26,
    },
    { header: "Guardian", key: "guardian", width: 26 },
    { header: "Guardian Phone", key: "phone", width: 20 },
    { header: "Admission Date", key: "date", width: 16 },
    { header: "Status", key: "status", width: 14 },
  ];
  for (const row of rows)
    sheet.addRow({
      admission: safeSpreadsheetText(row.admissionNumber),
      name: safeSpreadsheetText(row.fullName),
      gender: row.gender === "female" ? "Female" : "Male",
      className: safeSpreadsheetText(row.className),
      year: safeSpreadsheetText(row.academicYearName),
      term: safeSpreadsheetText(row.academicTermName),
      location: safeSpreadsheetText(row.schoolLocationName),
      hasDisability: row.hasDisability ? "Yes" : "No",
      disabilityDetails: row.disabilityDetails
        ? safeSpreadsheetText(row.disabilityDetails)
        : "",
      religiousDenomination: safeSpreadsheetText(row.religiousDenomination),
      guardian: safeSpreadsheetText(row.guardianName),
      phone: safeSpreadsheetText(row.guardianPhone),
      date: row.admissionDate,
      status: `${row.status.charAt(0).toUpperCase()}${row.status.slice(1)}`,
    });
  sheet.getRow(1).height = 28;
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFBD3B36" },
  };
  sheet.autoFilter = { from: "A1", to: "N1" };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
