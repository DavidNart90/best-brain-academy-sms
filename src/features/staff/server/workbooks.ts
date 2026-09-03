import "server-only";

import { createHash } from "node:crypto";
import ExcelJS from "exceljs";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import { staffInputSchema, type StaffInput } from "../schemas";
import type {
  ImportPreview,
  ImportPreviewRow,
  StaffDirectoryRow,
  StaffReferenceData,
} from "../types";

const MAX_IMPORT_ROWS = 250;
const headers = [
  "Staff ID",
  "Full Name",
  "First Name",
  "Middle Name",
  "Last Name",
  "Phone",
  "Email",
  "Staff Type",
  "Position",
  "Status",
  "Date Joined",
  "Known Subjects",
] as const;
const assignmentHeaders = [
  "Staff Row",
  "Academic Year",
  "Term",
  "Class",
  "Role",
  "Subject",
  "Starts On",
] as const;
const normalize = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");
const safeSpreadsheetText = (value: string) =>
  /^[=+\-@]/.test(value) ? "'" + value : value;

function cellText(cell: ExcelJS.Cell) {
  if (cell.value === null || cell.value === undefined) return "";
  // Formulas are not evaluated or accepted as staff facts.
  if (
    typeof cell.value === "object" &&
    ("formula" in cell.value || "sharedFormula" in cell.value)
  )
    throw new Error("Use plain values, not formulas, in staff workbooks.");
  if (cell.value instanceof Date) return cell.value.toISOString().slice(0, 10);
  return cell.text.trim();
}
function headerReader(sheet: ExcelJS.Worksheet) {
  const columns = new Map<string, number>();
  sheet
    .getRow(1)
    .eachCell((cell, column) => columns.set(normalize(cellText(cell)), column));
  return {
    has: (header: string) => columns.has(normalize(header)),
    text: (row: ExcelJS.Row, header: string) => {
      const column = columns.get(normalize(header));
      return column ? cellText(row.getCell(column)) : "";
    },
  };
}
function styleSheet(sheet: ExcelJS.Worksheet) {
  sheet.getRow(1).height = 28;
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFBD3B36" },
  };
  sheet.columns.forEach((column) => {
    column.width = 24;
  });
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: sheet.columnCount },
  };
}
export async function buildStaffTemplate(reference: StaffReferenceData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Best Brain Academy";
  const instructions = workbook.addWorksheet("Instructions");
  instructions.columns = [{ width: 24 }, { width: 95 }];
  instructions.addRows([
    [
      "Staff import",
      "Fill Staff, optionally add Assignments, preview and confirm. Up to 250 people.",
    ],
    [
      "Name",
      "Use Full Name exactly as supplied, or First Name and Last Name. Do not guess name components.",
    ],
    [
      "Staff ID",
      "Optional expected ID, in BBS-Staff-001 format. The server allocates IDs in row order, across all staff types.",
    ],
    [
      "Required",
      "Name, Staff Type (Teaching / Non-Teaching), Position, Status (Active / Inactive).",
    ],
    [
      "Missing details",
      "Leave unknown Phone, Email and Date Joined blank. Dates use YYYY-MM-DD.",
    ],
    [
      "Known Subjects",
      "Separate with semicolons. A known subject alone does not imply a class assignment.",
    ],
    [
      "Assignments",
      "One row per class and subject. Staff Row refers to the actual row number in the Staff sheet (first person is row 2).",
    ],
    [
      "Assignment Role",
      "teaching requires Subject (All subjects is allowed). head means Head class teacher, with Subject blank. general is a class link with role unconfirmed.",
    ],
    [
      "Academic context",
      "Enter the exact academic year, term and class from Reference Data. Starts On is required; never use an employment date by assumption.",
    ],
    [
      "Retry safety",
      "Retry the same file if the save result is unknown. Do not edit the workbook and re-import until the directory has been checked.",
    ],
    ["Login access", "Staff imports never create login accounts."],
  ]);
  instructions.eachRow((row) => {
    row.alignment = { vertical: "top", wrapText: true };
  });
  const staff = workbook.addWorksheet("Staff", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  staff.addRow([...headers]);
  styleSheet(staff);
  const assignments = workbook.addWorksheet("Assignments", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  assignments.addRow([...assignmentHeaders]);
  styleSheet(assignments);
  const refs = workbook.addWorksheet("Reference Data");
  refs.addRow(["Academic Year", "Term", "Class"]);
  const contexts = reference.academicTerms.map((term) => [
    reference.academicYears.find((year) => year.id === term.academicYearId)
      ?.name ?? "",
    term.name,
  ]);
  for (let i = 0; i < Math.max(contexts.length, reference.classes.length); i++)
    refs.addRow([
      contexts[i]?.[0] ?? "",
      contexts[i]?.[1] ?? "",
      reference.classes[i]?.name ?? "",
    ]);
  styleSheet(refs);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function parseStaffWorkbook(
  file: File,
  reference: StaffReferenceData,
  checkExisting = true,
): Promise<{
  preview: ImportPreview;
  validRows: StaffInput[];
  requestKey: string;
}> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const hash = createHash("sha256").update(bytes).digest("hex");
  const requestKey = [
    hash.slice(0, 8),
    hash.slice(8, 12),
    "5" + hash.slice(13, 16),
    "8" + hash.slice(17, 20),
    hash.slice(20, 32),
  ].join("-");
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(bytes as unknown as ArrayBuffer);
  } catch {
    throw new Error(
      "This workbook format could not be read. Copy the values into the downloaded staff template and try again. No records were saved.",
    );
  }
  const sheet = workbook.getWorksheet("Staff");
  if (!sheet)
    throw new Error("The workbook does not contain a Staff worksheet.");
  const reader = headerReader(sheet);
  const required = ["Staff Type", "Position", "Status"];
  if (!reader.has("Full Name")) required.push("First Name", "Last Name");
  const missing = required.filter((header) => !reader.has(header));
  if (missing.length)
    throw new Error("Missing columns: " + missing.join(", ") + ".");
  const assignmentSheet = workbook.getWorksheet("Assignments");
  const assignmentsByRow = new Map<number, StaffInput["assignments"]>();
  const assignmentErrors = new Map<number, string[]>();
  if (assignmentSheet) {
    const fields = headerReader(assignmentSheet);
    const missingAssignment = assignmentHeaders.filter(
      (header) => !fields.has(header),
    );
    if (missingAssignment.length)
      throw new Error("Missing columns: " + missingAssignment.join(", ") + ".");
    let assignmentCount = 0;
    for (let n = 2; n <= assignmentSheet.rowCount; n++) {
      const row = assignmentSheet.getRow(n);
      if (assignmentHeaders.every((header) => !fields.text(row, header)))
        continue;
      if (++assignmentCount > 1000)
        throw new Error("Import up to 1000 assignment rows at a time.");
      const staffRow = Number(fields.text(row, "Staff Row"));
      if (
        !Number.isInteger(staffRow) ||
        staffRow < 2 ||
        staffRow > sheet.rowCount
      )
        throw new Error("Each assignment must refer to a populated Staff row.");
      const year = reference.academicYears.find(
        (item) =>
          normalize(item.name) === normalize(fields.text(row, "Academic Year")),
      );
      const term = reference.academicTerms.find(
        (item) =>
          item.academicYearId === year?.id &&
          normalize(item.name) === normalize(fields.text(row, "Term")),
      );
      const schoolClass = reference.classes.find(
        (item) => normalize(item.name) === normalize(fields.text(row, "Class")),
      );
      const role = normalize(fields.text(row, "Role"));
      if (
        !year ||
        !term ||
        !schoolClass ||
        !["teaching", "head", "general"].includes(role)
      )
        assignmentErrors.set(staffRow, [
          ...(assignmentErrors.get(staffRow) ?? []),
          "Assignment row " +
            n +
            ": choose an active academic period, class and valid role.",
        ]);
      assignmentsByRow.set(staffRow, [
        ...(assignmentsByRow.get(staffRow) ?? []),
        {
          academicYearId: year?.id ?? 0,
          academicTermId: term?.id ?? 0,
          classId: schoolClass?.id ?? 0,
          startedOn: fields.text(row, "Starts On"),
          assignmentKind:
            role === "head"
              ? "head"
              : role === "general"
                ? "general"
                : "teaching",
          subjectName: fields.text(row, "Subject") || null,
        },
      ]);
    }
  }
  const rows: Array<{ parsed: StaffInput | null; preview: ImportPreviewRow }> =
    [];
  const populatedRows = new Set<number>();
  for (let n = 2; n <= sheet.rowCount; n++) {
    const row = sheet.getRow(n);
    if (headers.every((header) => !reader.text(row, header))) continue;
    populatedRows.add(n);
    if (rows.length >= MAX_IMPORT_ROWS)
      throw new Error("Import up to 250 staff at a time.");
    const input = {
      staffNumber: reader.text(row, "Staff ID"),
      fullName: reader.text(row, "Full Name"),
      firstName: reader.text(row, "First Name"),
      middleName: reader.text(row, "Middle Name"),
      lastName: reader.text(row, "Last Name"),
      phone: reader.text(row, "Phone"),
      email: reader.text(row, "Email").toLowerCase(),
      staffType: normalize(reader.text(row, "Staff Type")).replace("-", "_"),
      position: reader.text(row, "Position"),
      status: normalize(reader.text(row, "Status")),
      dateJoined: reader.text(row, "Date Joined"),
      knownSubjects: reader.text(row, "Known Subjects"),
      assignments: assignmentsByRow.get(n) ?? [],
    };
    const parsed = staffInputSchema.safeParse(input);
    const errors = [
      ...(assignmentErrors.get(n) ?? []),
      ...(parsed.success
        ? []
        : parsed.error.issues.map(
            (issue) => issue.path.join(".") + ": " + issue.message,
          )),
    ];
    if (reader.text(row, "Assigned Class"))
      errors.push(
        "Use the Assignments sheet with an explicit period, role, subject and start date.",
      );
    const descriptions = input.assignments.map((item) => {
      const label =
        reference.classes.find((entry) => entry.id === item.classId)?.name ??
        "Unknown class";
      return (
        label +
        ": " +
        (item.assignmentKind === "head"
          ? "Head class teacher"
          : (item.subjectName ?? "Role unconfirmed"))
      );
    });
    rows.push({
      parsed: parsed.success ? parsed.data : null,
      preview: {
        rowNumber: n,
        values: {
          staffNumber: input.staffNumber || "Assigned on save",
          fullName:
            input.fullName ||
            [input.firstName, input.middleName, input.lastName]
              .filter(Boolean)
              .join(" "),
          staffType: input.staffType,
          position: input.position,
          assignedClass: descriptions.join("; ") || "Not supplied",
          knownSubjects: input.knownSubjects || "Not supplied",
          status: input.status,
        },
        errors,
      },
    });
  }
  if (!rows.length)
    throw new Error("The Staff sheet does not contain any records.");
  if ([...assignmentsByRow.keys()].some((n) => !populatedRows.has(n)))
    throw new Error("Each assignment must refer to a populated Staff row.");
  const numbers = rows.flatMap((row) =>
    row.parsed?.staffNumber ? [row.parsed.staffNumber] : [],
  );
  for (const row of rows)
    if (
      row.parsed?.staffNumber &&
      numbers.filter((value) => value === row.parsed?.staffNumber).length > 1
    )
      row.preview.errors.push("Duplicate staff ID in this file.");
  const names = rows.map((row) => normalize(row.preview.values.fullName ?? ""));
  rows.forEach((row, index) => {
    if (names.filter((name) => name === names[index]).length > 1)
      row.preview.errors.push(
        "Duplicate name in this file; review these people separately before entry.",
      );
  });
  if (checkExisting && numbers.length) {
    const supabase = await createServerSupabaseClient();
    const existing = await supabase
      .from("staff")
      .select("staff_number")
      .in("staff_number", numbers)
      .limit(MAX_IMPORT_ROWS);
    if (existing.error)
      throw new Error("Existing staff could not be checked for duplicates.");
    const existingSet = new Set(existing.data.map((row) => row.staff_number));
    rows.forEach((row) => {
      if (row.parsed?.staffNumber && existingSet.has(row.parsed.staffNumber))
        row.preview.errors.push(
          "Duplicate staff ID already exists; check whether this file was previously imported.",
        );
    });
  }
  const errorCount = rows.filter((row) => row.preview.errors.length).length;
  return {
    requestKey,
    preview: {
      fileName: file.name,
      rows: rows.map((row) => row.preview),
      validCount: rows.length - errorCount,
      errorCount,
      duplicateCount: rows.filter((row) =>
        row.preview.errors.some((error) => error.includes("Duplicate")),
      ).length,
      canConfirm: !errorCount,
    },
    validRows: errorCount
      ? []
      : rows.flatMap((row) => (row.parsed ? [row.parsed] : [])),
  };
}
export async function importStaffRows(rows: StaffInput[], requestKey: string) {
  const supabase = await createServerSupabaseClient();
  const result = await supabase.rpc("import_staff", {
    payload: { requestKey, rows } as unknown as Json,
  });
  if (result.error) throw result.error;
  return Number(
    (result.data as { createdCount?: unknown } | null)?.createdCount ?? 0,
  );
}
export async function buildStaffExport(rows: StaffDirectoryRow[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Best Brain Academy";
  const sheet = workbook.addWorksheet("Staff", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.addRow([
    "Staff ID",
    "Staff Name",
    "Phone",
    "Email",
    "Staff Type",
    "Position",
    "Assigned Classes",
    "Known Subjects",
    "Date Joined",
    "Status",
  ]);
  for (const row of rows)
    sheet.addRow(
      [
        row.staffNumber,
        row.fullName,
        row.phone ?? "",
        row.email ?? "",
        row.staffType === "teaching" ? "Teaching" : "Non-Teaching",
        row.position,
        row.assignedClasses,
        row.knownSubjects.join("; "),
        row.dateJoined ?? "",
        row.status,
      ].map(safeSpreadsheetText),
    );
  styleSheet(sheet);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
