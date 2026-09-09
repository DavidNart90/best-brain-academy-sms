import { describe, expect, it } from "vitest";
import { buildFinancialPeriodSummary } from "./period-summary";
import type {
  FinancialTrendPoint,
  ReportFilters,
  ReportingPeriod,
} from "./types";

const options: ReportingPeriod = {
  academicYears: [
    {
      id: 1,
      name: "2026/2027",
      startsOn: "2026-09-01",
      endsOn: "2027-08-31",
      isCurrent: true,
    },
  ],
  academicTerms: [
    {
      id: 10,
      academicYearId: 1,
      name: "Term 1",
      startsOn: "2026-09-08",
      endsOn: "2026-12-07",
      isCurrent: true,
    },
    {
      id: 11,
      academicYearId: 1,
      name: "Term 2",
      startsOn: "2027-01-05",
      endsOn: "2027-04-02",
      isCurrent: false,
    },
  ],
  classes: [],
  students: [],
  staff: [],
  paymentMethods: [],
  expenseCategories: [],
};

function filters(
  period: ReportFilters["period"],
  start: string,
  end: string,
): ReportFilters {
  return {
    view: "financial-summary",
    period,
    start,
    end,
    academicYearId: 1,
    academicTermId: period === "term" ? 10 : undefined,
    status: "active",
    page: 1,
  };
}

function point(
  periodStart: string,
  revenue: number,
  expenses = 0,
): FinancialTrendPoint {
  return {
    periodStart,
    grossReceipts: revenue,
    expenses,
    salaryDeductions: 0,
    operatingNet: revenue - expenses,
    finalPosition: revenue - expenses,
  };
}

describe("financial period summaries", () => {
  it("shows Monday to Friday only and totals using integer cents", () => {
    const result = buildFinancialPeriodSummary(
      [
        point("2026-09-07", 0.1),
        point("2026-09-08", 0.2),
        point("2026-09-11", 10, 3.25),
        point("2026-09-12", 99),
      ],
      filters("weekly", "2026-09-07", "2026-09-11"),
      options,
    );

    expect(result.rows.map((row) => row.label)).toEqual([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
    ]);
    expect(result.total).toEqual({
      revenue: "10.30",
      expenses: "3.25",
      net: "7.05",
    });
  });

  it("groups the 22nd through month-end into Week 4", () => {
    const result = buildFinancialPeriodSummary(
      [point("2026-09-01", 1), point("2026-09-22", 2), point("2026-09-30", 3)],
      filters("monthly", "2026-09-01", "2026-09-30"),
      options,
    );

    expect(result.rows).toHaveLength(4);
    expect(result.rows[3]).toMatchObject({
      label: "Week 4",
      start: "2026-09-22",
      end: "2026-09-30",
      revenue: "5.00",
    });
  });

  it("clips month rows to the configured term reporting range", () => {
    const result = buildFinancialPeriodSummary(
      [point("2026-09-08", 10), point("2026-10-01", 20)],
      filters("term", "2026-09-08", "2026-10-15"),
      options,
    );

    expect(result.rows).toMatchObject([
      { label: "September 2026", start: "2026-09-08", end: "2026-09-30" },
      { label: "October 2026", start: "2026-10-01", end: "2026-10-15" },
    ]);
  });

  it("uses configured term dates for the academic cycle", () => {
    const result = buildFinancialPeriodSummary(
      [point("2026-09-08", 10), point("2027-01-05", 20)],
      filters("academic-cycle", "2026-09-01", "2027-04-02"),
      options,
    );

    expect(result.rows).toMatchObject([
      { label: "Term 1", start: "2026-09-08", end: "2026-12-07" },
      { label: "Term 2", start: "2027-01-05", end: "2027-04-02" },
    ]);
    expect(result.total.revenue).toBe("30.00");
  });
});
