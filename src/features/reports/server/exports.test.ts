// @vitest-environment node
import ExcelJS from "exceljs";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { buildReportCsv, buildReportWorkbook } from "./exports";
import type { ReportFilters, ReportTable } from "../types";

const filters: ReportFilters = {
  view: "collections",
  period: "term",
  start: "2026-09-01",
  end: "2026-09-30",
  status: "active",
  page: 1,
};
const table: ReportTable = {
  title: "Collection report",
  description: "Synthetic export verification",
  columns: [
    { key: "person", label: "Payer" },
    { key: "amount", label: "Amount", align: "right" },
  ],
  rows: [
    { person: '=WEBSERVICE("https://example.invalid")', amount: "1250.50" },
  ],
  total: 1,
  page: 1,
  pageSize: 25,
};

describe("report exports", () => {
  it("protects spreadsheet text and preserves money as a number", async () => {
    const csv = buildReportCsv(table, filters);
    expect(csv).toContain("'=WEBSERVICE");

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(
      (await buildReportWorkbook(table, filters)) as unknown as ArrayBuffer,
    );
    const sheet = workbook.getWorksheet("Collections");
    expect(sheet?.getCell("A5").value).toBe(
      `'=${'WEBSERVICE("https://example.invalid")'}`,
    );
    expect(sheet?.getCell("B5").value).toBe(1250.5);
    expect(sheet?.getCell("B5").numFmt).toBe('"GHS" #,##0.00');
  });

  it("builds a complete 10,000-row workbook", async () => {
    const largeTable: ReportTable = {
      ...table,
      rows: Array.from({ length: 10_000 }, (_, index) => ({
        person: `Payer ${index + 1}`,
        amount: `${index + 0.5}`,
      })),
      total: 10_000,
      pageSize: 10_000,
    };

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(
      (await buildReportWorkbook(
        largeTable,
        filters,
      )) as unknown as ArrayBuffer,
    );
    const sheet = workbook.getWorksheet("Collections");

    expect(sheet?.rowCount).toBe(10_004);
    expect(sheet?.getCell("A10004").value).toBe("Payer 10000");
    expect(sheet?.getCell("B10004").value).toBe(9999.5);
  });
});
