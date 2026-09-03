// @vitest-environment node
import ExcelJS from "exceljs";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));
import { buildStaffTemplate, parseStaffWorkbook } from "./workbooks";
const reference = {
  academicYears: [{ id: 1, name: "2026/2027", isCurrent: true }],
  academicTerms: [
    { id: 1, academicYearId: 1, name: "Term 1", isCurrent: true },
  ],
  classes: [
    { id: 5, name: "Basic 1" },
    { id: 6, name: "Basic 2" },
  ],
};
async function sample() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    (await buildStaffTemplate(reference)) as unknown as ArrayBuffer,
  );
  workbook
    .getWorksheet("Staff")
    ?.addRow([
      "BBS-Staff-001",
      "Synthetic Teacher Example",
      "",
      "",
      "",
      "",
      "",
      "Teaching",
      "Teacher",
      "Active",
      "",
      "Maths; Science",
    ]);
  return workbook;
}
async function file(workbook: ExcelJS.Workbook) {
  const buffer = await workbook.xlsx.writeBuffer();
  return new File([new Uint8Array(buffer)], "synthetic-staff.xlsx");
}
describe("staff workbook business rules", () => {
  it("explains unreadable workbooks without suggesting duplicate records", async () => {
    await expect(
      parseStaffWorkbook(
        new File(["not a workbook"], "invalid.xlsx"),
        reference,
      ),
    ).rejects.toThrow("No records were saved.");
  });
  it("imports partial details and preserves explicit pairs", async () => {
    const workbook = await sample();
    workbook.getWorksheet("Assignments")?.addRows([
      [2, "2026/2027", "Term 1", "Basic 1", "teaching", "Maths", "2026-09-08"],
      [
        2,
        "2026/2027",
        "Term 1",
        "Basic 2",
        "teaching",
        "Science",
        "2026-09-08",
      ],
    ]);
    const result = await parseStaffWorkbook(
      await file(workbook),
      reference,
      false,
    );
    expect(result.preview.canConfirm).toBe(true);
    const first = result.validRows[0];
    if (!first) throw new Error("Expected a validated staff row");
    expect(first.phone).toBeNull();
    expect(
      first.assignments.map((row) => [row.classId, row.subjectName]),
    ).toEqual([
      [5, "Maths"],
      [6, "Science"],
    ]);
  });
  it("keeps the same request key for exact-file retries", async () => {
    const input = await file(await sample());
    const first = await parseStaffWorkbook(input, reference, false);
    const second = await parseStaffWorkbook(input, reference, false);
    expect(first.requestKey).toBe(second.requestKey);
  });
  it("rejects duplicate people and duplicate expected IDs in a batch", async () => {
    const workbook = await sample();
    workbook
      .getWorksheet("Staff")
      ?.addRow([
        "BBS-Staff-001",
        "Synthetic Teacher Example",
        "",
        "",
        "",
        "",
        "",
        "Teaching",
        "Teacher",
        "Active",
      ]);
    const result = await parseStaffWorkbook(
      await file(workbook),
      reference,
      false,
    );
    expect(result.preview.duplicateCount).toBe(2);
    expect(result.validRows).toEqual([]);
  });
  it("does not invent missing assignment dates", async () => {
    const workbook = await sample();
    workbook
      .getWorksheet("Assignments")
      ?.addRow([2, "2026/2027", "Term 1", "Basic 1", "teaching", "Maths", ""]);
    const result = await parseStaffWorkbook(
      await file(workbook),
      reference,
      false,
    );
    expect(result.preview.canConfirm).toBe(false);
    expect(result.validRows).toEqual([]);
  });
  it("rejects references to empty staff rows", async () => {
    const workbook = await sample();
    workbook
      .getWorksheet("Assignments")
      ?.addRow([
        9,
        "2026/2027",
        "Term 1",
        "Basic 1",
        "teaching",
        "Maths",
        "2026-09-08",
      ]);
    await expect(
      parseStaffWorkbook(await file(workbook), reference, false),
    ).rejects.toThrow("populated Staff row");
  });
  it("does not accept formulas as staff information", async () => {
    const workbook = await sample();
    const sheet = workbook.getWorksheet("Staff");
    if (!sheet) throw new Error("Missing test sheet");
    sheet.getCell("B2").value = { formula: "CONCAT(1,2)", result: "12" };
    await expect(
      parseStaffWorkbook(await file(workbook), reference, false),
    ).rejects.toThrow("plain values");
  });
});
