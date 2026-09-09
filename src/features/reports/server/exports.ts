import "server-only";

import ExcelJS from "exceljs";
import type { ReportFilters, ReportTable } from "../types";

function safeSpreadsheetText(value: string) {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string | number | null) {
  const safe =
    typeof value === "string"
      ? safeSpreadsheetText(value)
      : String(value ?? "");
  return `"${safe.replace(/"/g, '""')}"`;
}

function isMoneyColumn(key: string) {
  return [
    "amount",
    "total",
    "amountPaid",
    "outstanding",
    "debit",
    "credit",
    "balance",
    "revenue",
    "expenses",
    "net",
  ].includes(key);
}

function titleCase(value: string) {
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function buildReportCsv(table: ReportTable, filters: ReportFilters) {
  const lines = [
    ["Best Brain Academy", table.title],
    ["Period", `${filters.start} to ${filters.end}`],
    [],
    table.columns.map((column) => column.label),
    ...table.rows.map((row) =>
      table.columns.map((column) => row[column.key] ?? ""),
    ),
  ];
  return `\uFEFF${lines
    .map((line) => line.map((value) => csvCell(value)).join(","))
    .join("\r\n")}`;
}

export async function buildReportWorkbook(
  table: ReportTable,
  filters: ReportFilters,
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Best Brain Academy";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(titleCase(filters.view).slice(0, 31), {
    views: [{ state: "frozen", ySplit: 4, showGridLines: false }],
  });
  sheet.addRow(["Best Brain Academy"]);
  sheet.addRow([table.title]);
  sheet.addRow([`Period: ${filters.start} to ${filters.end}`]);
  sheet.addRow(table.columns.map((column) => column.label));
  sheet.mergeCells(1, 1, 1, Math.max(table.columns.length, 1));
  sheet.mergeCells(2, 1, 2, Math.max(table.columns.length, 1));
  sheet.mergeCells(3, 1, 3, Math.max(table.columns.length, 1));
  sheet.getRow(1).font = { bold: true, size: 16, color: { argb: "FF1F2328" } };
  sheet.getRow(2).font = { bold: true, size: 13, color: { argb: "FF1F2328" } };
  sheet.getRow(3).font = { color: { argb: "FF667085" } };
  const header = sheet.getRow(4);
  header.height = 28;
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFBD3B36" },
  };
  table.rows.forEach((row) => {
    const values = table.columns.map((column) => {
      const value = row[column.key];
      if (isMoneyColumn(column.key) && value !== null && value !== "") {
        const amount = Number(value);
        return Number.isFinite(amount) ? amount : 0;
      }
      return typeof value === "string" ? safeSpreadsheetText(value) : value;
    });
    sheet.addRow(values);
  });
  table.columns.forEach((column, index) => {
    const worksheetColumn = sheet.getColumn(index + 1);
    worksheetColumn.width = Math.min(
      34,
      Math.max(
        12,
        column.label.length + 3,
        ...table.rows
          .slice(0, 250)
          .map((row) => String(row[column.key] ?? "").length + 2),
      ),
    );
    if (isMoneyColumn(column.key)) {
      worksheetColumn.numFmt = '"GHS" #,##0.00';
      worksheetColumn.alignment = { horizontal: "right" };
    }
  });
  sheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4, column: Math.max(table.columns.length, 1) },
  };
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    row.alignment = {
      vertical: "middle",
      wrapText: rowNumber <= 4,
    };
  });
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
