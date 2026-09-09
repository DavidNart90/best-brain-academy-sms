import type {
  FinancialPeriodSummary,
  FinancialTrendPoint,
  ReportFilters,
  ReportingPeriod,
} from "./types";

const dayMs = 86_400_000;
const shortDate = new Intl.DateTimeFormat("en-GH", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const monthName = new Intl.DateTimeFormat("en-GH", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function dateFromIso(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function isoFromDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addDays(value: string, days: number) {
  return isoFromDate(new Date(dateFromIso(value).getTime() + days * dayMs));
}

function maxDate(left: string, right: string) {
  return left > right ? left : right;
}

function minDate(left: string, right: string) {
  return left < right ? left : right;
}

function toCents(value: number) {
  return Math.round(value * 100);
}

function moneyFromCents(value: number) {
  return (value / 100).toFixed(2);
}

function valuesForRange(
  points: FinancialTrendPoint[],
  start: string,
  end: string,
) {
  return points.reduce(
    (total, point) => {
      if (point.periodStart < start || point.periodStart > end) return total;
      total.revenue += toCents(point.grossReceipts);
      total.expenses += toCents(point.expenses);
      total.net += toCents(point.operatingNet);
      return total;
    },
    { revenue: 0, expenses: 0, net: 0 },
  );
}

function rowForRange(
  label: string,
  start: string,
  end: string,
  points: FinancialTrendPoint[],
) {
  const values = valuesForRange(points, start, end);
  return {
    label,
    start,
    end,
    revenue: moneyFromCents(values.revenue),
    expenses: moneyFromCents(values.expenses),
    net: moneyFromCents(values.net),
  };
}

function totalRows(rows: FinancialPeriodSummary["rows"]) {
  const total = rows.reduce(
    (result, row) => {
      result.revenue += toCents(Number(row.revenue));
      result.expenses += toCents(Number(row.expenses));
      result.net += toCents(Number(row.net));
      return result;
    },
    { revenue: 0, expenses: 0, net: 0 },
  );
  return {
    revenue: moneyFromCents(total.revenue),
    expenses: moneyFromCents(total.expenses),
    net: moneyFromCents(total.net),
  };
}

function weeklyRows(points: FinancialTrendPoint[], filters: ReportFilters) {
  const rows = Array.from({ length: 5 }, (_, index) => {
    const date = addDays(filters.start, index);
    const label = new Intl.DateTimeFormat("en-GH", {
      weekday: "long",
      timeZone: "UTC",
    }).format(dateFromIso(date));
    return rowForRange(label, date, date, points);
  });
  return {
    title: "Weekly financial summary",
    description: `Monday to Friday, ${shortDate.format(dateFromIso(filters.start))}–${shortDate.format(dateFromIso(filters.end))}.`,
    rows,
  };
}

function monthlyRows(points: FinancialTrendPoint[], filters: ReportFilters) {
  const monthStart = filters.start;
  const monthEnd = filters.end;
  const buckets = [
    ["Week 1", monthStart, addDays(monthStart, 6)],
    ["Week 2", addDays(monthStart, 7), addDays(monthStart, 13)],
    ["Week 3", addDays(monthStart, 14), addDays(monthStart, 20)],
    ["Week 4", addDays(monthStart, 21), monthEnd],
  ] as const;
  return {
    title: "Monthly financial summary",
    description: `${monthName.format(dateFromIso(monthStart))}; Week 4 includes the 22nd through month-end.`,
    rows: buckets.map(([label, start, end]) =>
      rowForRange(label, start, minDate(end, monthEnd), points),
    ),
  };
}

function termRows(points: FinancialTrendPoint[], filters: ReportFilters) {
  const rows = [];
  let cursor = filters.start;
  while (cursor <= filters.end) {
    const date = dateFromIso(cursor);
    const nextMonth = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1),
    );
    const monthEnd = addDays(isoFromDate(nextMonth), -1);
    const end = minDate(monthEnd, filters.end);
    rows.push(rowForRange(monthName.format(date), cursor, end, points));
    cursor = addDays(end, 1);
  }
  return {
    title: "Term financial summary",
    description:
      "Calendar months within the configured academic term, to the selected reporting date.",
    rows,
  };
}

function academicCycleRows(
  points: FinancialTrendPoint[],
  filters: ReportFilters,
  options: ReportingPeriod,
) {
  const rows = options.academicTerms
    .filter((term) => term.academicYearId === filters.academicYearId)
    .sort((left, right) => left.startsOn.localeCompare(right.startsOn))
    .flatMap((term) => {
      const start = maxDate(term.startsOn, filters.start);
      const end = minDate(term.endsOn, filters.end);
      return start <= end ? [rowForRange(term.name, start, end, points)] : [];
    });
  return {
    title: "Academic cycle financial summary",
    description:
      "Configured academic terms within the selected academic cycle, to the reporting date.",
    rows,
  };
}

export function buildFinancialPeriodSummary(
  points: FinancialTrendPoint[],
  filters: ReportFilters,
  options: ReportingPeriod,
): FinancialPeriodSummary {
  const result =
    filters.period === "weekly"
      ? weeklyRows(points, filters)
      : filters.period === "monthly"
        ? monthlyRows(points, filters)
        : filters.period === "academic-cycle"
          ? academicCycleRows(points, filters, options)
          : termRows(points, filters);
  return { ...result, total: totalRows(result.rows) };
}
