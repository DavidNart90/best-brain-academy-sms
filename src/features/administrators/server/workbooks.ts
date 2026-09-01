import "server-only";

import ExcelJS from "exceljs";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  administratorInvitationSchema,
  type AdministratorInvitation,
} from "../schemas";
import type {
  AdministratorDirectoryRow,
  AdministratorImportPreview,
  AdministratorImportPreviewRow,
} from "../types";

const MAX_ROWS = 100;
const headers = [
  "Full Name",
  "Email",
  "Phone",
  "Role",
  "Status",
  "Temporary Password",
] as const;
const normalize = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");
const safeText = (value: string) =>
  /^[=+\-@]/.test(value) ? `'${value}` : value;
function textValue(cell: ExcelJS.Cell) {
  if (cell.value === null || cell.value === undefined) return "";
  if (typeof cell.value === "object" && "result" in cell.value)
    return String(cell.value.result ?? "").trim();
  return cell.text.trim();
}

export async function buildAdministratorTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Best Brain Academy";
  const instructions = workbook.addWorksheet("Instructions", {
    views: [{ showGridLines: false }],
  });
  instructions.columns = [{ width: 24 }, { width: 82 }];
  instructions.addRows([
    [
      "Administrator import",
      "Complete the Administrators sheet, preview every row, then explicitly confirm account creation.",
    ],
    [
      "Required",
      "Full Name, Email, Role, Status and Temporary Password. Phone is optional.",
    ],
    ["Roles", "Super Administrator, Administrator, Accountant or Management."],
    [
      "Security",
      "No invitation or OTP is sent. Share each temporary password securely; the user must change it at first sign-in. Delete the completed workbook after import.",
    ],
    ["Limit", `Create up to ${MAX_ROWS} administrators per workbook.`],
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

  const sheet = workbook.addWorksheet("Administrators", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: false }],
  });
  sheet.addRow([...headers]);
  [28, 32, 20, 24, 16, 28].forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
  sheet.getRow(1).height = 28;
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFBD3B36" },
  };
  sheet.autoFilter = { from: "A1", to: "F1" };
  const refs = workbook.addWorksheet("Reference Data");
  refs.state = "veryHidden";
  refs.addRows([
    ["Role", "Status"],
    ["Super Administrator", "Active"],
    ["Administrator", "Disabled"],
    ["Accountant", ""],
    ["Management", ""],
  ]);
  for (let row = 2; row <= MAX_ROWS + 1; row += 1) {
    sheet.getCell(`D${row}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: ["'Reference Data'!$A$2:$A$5"],
    };
    sheet.getCell(`E${row}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: ["'Reference Data'!$B$2:$B$3"],
    };
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

const roleMap = new Map([
  ["super administrator", "SUPER_ADMIN"],
  ["administrator", "ADMINISTRATOR"],
  ["accountant", "ACCOUNTANT"],
  ["management", "MANAGEMENT"],
]);
export async function parseAdministratorWorkbook(file: File): Promise<{
  preview: AdministratorImportPreview;
  validRows: AdministratorInvitation[];
}> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    new Uint8Array(await file.arrayBuffer()) as unknown as ArrayBuffer,
  );
  const sheet =
    workbook.getWorksheet("Administrators") ?? workbook.worksheets[0];
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
  const rows: Array<{
    parsed: AdministratorInvitation | null;
    preview: AdministratorImportPreviewRow;
  }> = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    if (headers.every((header) => !textValue(cell(row, header)))) continue;
    if (rows.length >= MAX_ROWS)
      throw new Error(`Import up to ${MAX_ROWS} administrators at a time.`);
    const roleLabel = normalize(textValue(cell(row, "Role")));
    const input = {
      displayName: textValue(cell(row, "Full Name")),
      email: textValue(cell(row, "Email")).toLowerCase(),
      phone: textValue(cell(row, "Phone")),
      role:
        roleMap.get(roleLabel) ?? roleLabel.toUpperCase().replaceAll(" ", "_"),
      status: normalize(textValue(cell(row, "Status"))),
      temporaryPassword: textValue(cell(row, "Temporary Password")),
    };
    const parsed = administratorInvitationSchema.safeParse(input);
    rows.push({
      parsed: parsed.success ? parsed.data : null,
      preview: {
        rowNumber,
        values: {
          displayName: input.displayName,
          email: input.email,
          phone: input.phone,
          role: roleMap.get(roleLabel) ?? input.role,
          status: input.status,
          temporaryPassword: "Configured (hidden)",
        },
        errors: parsed.success
          ? []
          : parsed.error.issues.map(
              (issue) => `${String(issue.path[0] ?? "Row")}: ${issue.message}`,
            ),
      },
    });
  }
  if (!rows.length)
    throw new Error("The Administrators sheet does not contain any records.");
  const emails = new Map<string, number[]>();
  for (const row of rows)
    if (row.parsed)
      emails.set(row.parsed.email, [
        ...(emails.get(row.parsed.email) ?? []),
        row.preview.rowNumber,
      ]);
  for (const [email, rowNumbers] of emails)
    if (rowNumbers.length > 1)
      for (const rowNumber of rowNumbers)
        rows
          .find((row) => row.preview.rowNumber === rowNumber)
          ?.preview.errors.push(`Duplicate email ${email} in this file.`);
  const validRows = rows.flatMap((row) => (row.parsed ? [row.parsed] : []));
  const supabase = await createServerSupabaseClient();
  const existing = validRows.length
    ? await supabase
        .from("administrator_accounts")
        .select("email")
        .in(
          "email",
          validRows.map((row) => row.email),
        )
        .limit(MAX_ROWS)
    : { data: [], error: null };
  if (existing.error)
    throw new Error("Existing accounts could not be checked for duplicates.");
  const existingEmails = new Set(
    existing.data.map((row) => row.email.toLowerCase()),
  );
  for (const row of rows)
    if (row.parsed && existingEmails.has(row.parsed.email))
      row.preview.errors.push("Duplicate: this email already has an account.");
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

export async function buildAdministratorExport(
  rows: AdministratorDirectoryRow[],
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Best Brain Academy";
  const sheet = workbook.addWorksheet("Administrators", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: false }],
  });
  sheet.columns = [
    { header: "Full Name", key: "name", width: 28 },
    { header: "Email", key: "email", width: 32 },
    { header: "Phone", key: "phone", width: 20 },
    { header: "Role", key: "role", width: 24 },
    { header: "Status", key: "status", width: 16 },
    { header: "Last Sign In", key: "lastSignIn", width: 24 },
  ];
  for (const row of rows)
    sheet.addRow({
      name: safeText(row.displayName),
      email: safeText(row.email),
      phone: safeText(row.phone ?? ""),
      role: row.role ?? "Unassigned",
      status: row.status,
      lastSignIn: row.lastSignInAt ?? "Never",
    });
  sheet.getRow(1).height = 28;
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFBD3B36" },
  };
  sheet.autoFilter = { from: "A1", to: "F1" };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
