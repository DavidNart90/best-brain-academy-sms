import "server-only";

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
  "First Name",
  "Middle Name",
  "Last Name",
  "Phone",
  "Email",
  "Staff Type",
  "Position",
  "Assigned Class",
  "Status",
] as const;

function textValue(cell: ExcelJS.Cell) {
  if (cell.value === null || cell.value === undefined) return "";
  if (typeof cell.value === "object" && "result" in cell.value)
    return String(cell.value.result ?? "").trim();
  return cell.text.trim();
}
const normalize = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");
const safeSpreadsheetText = (value: string) =>
  /^[=+\-@]/.test(value) ? `'${value}` : value;

export async function buildStaffTemplate(reference: StaffReferenceData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Best Brain Academy";
  const instructions = workbook.addWorksheet("Instructions", {
    views: [{ showGridLines: false }],
  });
  instructions.columns = [{ width: 24 }, { width: 82 }];
  instructions.addRows([
    [
      "Staff import template",
      "Complete the Staff sheet, preview it in the application, then explicitly confirm.",
    ],
    [
      "Required",
      "Staff ID, First Name, Last Name, Phone, Staff Type, Position and Status.",
    ],
    [
      "Assigned Class",
      "Optional. An assignment uses the current academic year and term.",
    ],
    [
      "Login access",
      "Importing staff never creates an administrator login account.",
    ],
    [
      "Limit",
      `Import up to ${MAX_IMPORT_ROWS} staff at a time. Every row must pass before saving.`,
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

  const sheet = workbook.addWorksheet("Staff", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: false }],
  });
  sheet.addRow([...headers]);
  sheet.getRow(1).height = 28;
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFBD3B36" },
  };
  [18, 18, 18, 18, 18, 28, 18, 24, 24, 14].forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
  sheet.autoFilter = { from: "A1", to: "J1" };

  const refs = workbook.addWorksheet("Reference Data");
  refs.state = "veryHidden";
  refs.addRow(["Staff Type", "Status", "Classes"]);
  const longest = Math.max(2, reference.classes.length);
  for (let index = 0; index < longest; index += 1)
    refs.addRow([
      ["Teaching", "Non-Teaching"][index] ?? "",
      ["Active", "Inactive"][index] ?? "",
      reference.classes[index]?.name ?? "",
    ]);
  for (let row = 2; row <= MAX_IMPORT_ROWS + 1; row += 1) {
    sheet.getCell(`G${row}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: ["'Reference Data'!$A$2:$A$3"],
    };
    sheet.getCell(`I${row}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`'Reference Data'!$C$2:$C$${reference.classes.length + 1}`],
    };
    sheet.getCell(`J${row}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: ["'Reference Data'!$B$2:$B$3"],
    };
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function parseStaffWorkbook(
  file: File,
  reference: StaffReferenceData,
): Promise<{ preview: ImportPreview; validRows: StaffInput[] }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    new Uint8Array(await file.arrayBuffer()) as unknown as ArrayBuffer,
  );
  const sheet = workbook.getWorksheet("Staff") ?? workbook.worksheets[0];
  if (!sheet) throw new Error("The workbook does not contain a worksheet.");
  const headerMap = new Map<string, number>();
  sheet
    .getRow(1)
    .eachCell((cell, column) =>
      headerMap.set(normalize(textValue(cell)), column),
    );
  const missing = headers.filter((header) => !headerMap.has(normalize(header)));
  if (missing.length)
    throw new Error(`Missing columns: ${missing.join(", ")}.`);
  const cell = (row: ExcelJS.Row, header: (typeof headers)[number]) =>
    row.getCell(headerMap.get(normalize(header)) ?? 0);
  const classMap = new Map(
    reference.classes.map((item) => [normalize(item.name), item.id]),
  );
  const currentYear =
    reference.academicYears.find((item) => item.isCurrent) ??
    reference.academicYears[0];
  const currentTerm =
    reference.academicTerms.find(
      (item) => item.isCurrent && item.academicYearId === currentYear?.id,
    ) ??
    reference.academicTerms.find(
      (item) => item.academicYearId === currentYear?.id,
    );
  const rows: Array<{ parsed: StaffInput | null; preview: ImportPreviewRow }> =
    [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    if (headers.every((header) => !textValue(cell(row, header)))) continue;
    if (rows.length >= MAX_IMPORT_ROWS)
      throw new Error(`Import up to ${MAX_IMPORT_ROWS} staff at a time.`);
    const assignedClass = textValue(cell(row, "Assigned Class"));
    const input = {
      staffNumber: textValue(cell(row, "Staff ID")),
      firstName: textValue(cell(row, "First Name")),
      middleName: textValue(cell(row, "Middle Name")),
      lastName: textValue(cell(row, "Last Name")),
      phone: textValue(cell(row, "Phone")),
      email: textValue(cell(row, "Email")).toLowerCase(),
      staffType: normalize(textValue(cell(row, "Staff Type"))).replace(
        "-",
        "_",
      ),
      position: textValue(cell(row, "Position")),
      status: normalize(textValue(cell(row, "Status"))),
      dateJoined: "",
      academicYearId: assignedClass ? currentYear?.id : null,
      academicTermId: assignedClass ? currentTerm?.id : null,
      classId: assignedClass ? classMap.get(normalize(assignedClass)) : null,
      assignmentStartedOn: assignedClass
        ? new Date().toISOString().slice(0, 10)
        : null,
    };
    const parsed = staffInputSchema.safeParse(input);
    const errors = parsed.success
      ? []
      : parsed.error.issues.map(
          (issue) => `${String(issue.path[0] ?? "Row")}: ${issue.message}`,
        );
    if (assignedClass && !classMap.has(normalize(assignedClass)))
      errors.push(`Assigned Class: “${assignedClass}” is not an active class.`);
    rows.push({
      parsed: parsed.success ? parsed.data : null,
      preview: {
        rowNumber,
        values: {
          staffNumber: String(input.staffNumber).toUpperCase(),
          fullName: [input.firstName, input.middleName, input.lastName]
            .filter(Boolean)
            .join(" "),
          staffType: String(input.staffType),
          position: String(input.position),
          assignedClass: assignedClass || "—",
          status: String(input.status),
        },
        errors,
      },
    });
  }
  if (!rows.length)
    throw new Error("The Staff sheet does not contain any records.");
  const numbers = new Map<string, number[]>();
  for (const row of rows)
    if (row.parsed)
      numbers.set(row.parsed.staffNumber, [
        ...(numbers.get(row.parsed.staffNumber) ?? []),
        row.preview.rowNumber,
      ]);
  for (const [number, rowNumbers] of numbers)
    if (rowNumbers.length > 1)
      for (const rowNumber of rowNumbers)
        rows
          .find((row) => row.preview.rowNumber === rowNumber)
          ?.preview.errors.push(`Duplicate staff ID ${number} in this file.`);
  const validRows = rows.flatMap((row) => (row.parsed ? [row.parsed] : []));
  const supabase = await createServerSupabaseClient();
  const existing = validRows.length
    ? await supabase
        .from("staff")
        .select("staff_number")
        .in(
          "staff_number",
          validRows.map((row) => row.staffNumber),
        )
        .limit(MAX_IMPORT_ROWS)
    : { data: [], error: null };
  if (existing.error)
    throw new Error("Existing staff could not be checked for duplicates.");
  const existingSet = new Set(
    existing.data.map((row) => row.staff_number.toUpperCase()),
  );
  for (const row of rows)
    if (row.parsed && existingSet.has(row.parsed.staffNumber))
      row.preview.errors.push("Duplicate: staff ID already exists.");
  const errorCount = rows.filter((row) => row.preview.errors.length).length;
  const duplicateCount = rows.filter((row) =>
    row.preview.errors.some((error) =>
      error.toLowerCase().includes("duplicate"),
    ),
  ).length;
  return {
    preview: {
      fileName: file.name,
      rows: rows.map((row) => row.preview),
      validCount: rows.length - errorCount,
      errorCount,
      duplicateCount,
      canConfirm: errorCount === 0,
    },
    validRows: errorCount === 0 ? validRows : [],
  };
}

export async function importStaffRows(rows: StaffInput[]) {
  const supabase = await createServerSupabaseClient();
  const result = await supabase.rpc("import_staff", {
    payload: rows as unknown as Json,
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
    views: [{ state: "frozen", ySplit: 1, showGridLines: false }],
  });
  sheet.columns = [
    { header: "Staff ID", key: "staffNumber", width: 18 },
    { header: "Staff Name", key: "name", width: 28 },
    { header: "Phone", key: "phone", width: 20 },
    { header: "Email", key: "email", width: 28 },
    { header: "Staff Type", key: "type", width: 18 },
    { header: "Position", key: "position", width: 24 },
    { header: "Assigned Classes", key: "classes", width: 32 },
    { header: "Date Joined", key: "date", width: 16 },
    { header: "Status", key: "status", width: 14 },
  ];
  for (const row of rows)
    sheet.addRow({
      staffNumber: safeSpreadsheetText(row.staffNumber),
      name: safeSpreadsheetText(row.fullName),
      phone: safeSpreadsheetText(row.phone),
      email: safeSpreadsheetText(row.email ?? ""),
      type: row.staffType === "teaching" ? "Teaching" : "Non-Teaching",
      position: safeSpreadsheetText(row.position),
      classes: safeSpreadsheetText(row.assignedClasses),
      date: row.dateJoined ?? "",
      status: `${row.status.charAt(0).toUpperCase()}${row.status.slice(1)}`,
    });
  sheet.getRow(1).height = 28;
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFBD3B36" },
  };
  sheet.autoFilter = { from: "A1", to: "I1" };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
