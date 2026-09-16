import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getFinancialSnapshot,
  getReportTable,
  getReportingOptions,
  resolveReportFilters,
} from "@/features/reports/server/queries";
import type { OutstandingInvoiceRow } from "@/features/finance/types";
import type {
  AdministratorDashboardData,
  BoardDashboardData,
  SuperAdminOperationsData,
} from "../types";

type RawQuery = Record<string, string | string[] | undefined>;

const dashboardError =
  "Dashboard information could not be loaded. Try again or contact an administrator.";

function money(value: number | null | undefined) {
  return Number(value ?? 0).toFixed(2);
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const boardPeriods = ["monthly", "term", "academic-cycle"] as const;

const monthLabel = new Intl.DateTimeFormat("en-GH", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export async function getBoardDashboardData(
  raw: RawQuery,
): Promise<BoardDashboardData> {
  const options = await getReportingOptions();
  const requestedPeriod = firstValue(raw.period);
  const period = boardPeriods.includes(
    requestedPeriod as (typeof boardPeriods)[number],
  )
    ? (requestedPeriod as (typeof boardPeriods)[number])
    : "term";
  const requestedMonth = firstValue(raw.month);
  const monthStart = /^\d{4}-\d{2}$/.test(requestedMonth ?? "")
    ? `${requestedMonth}-01`
    : undefined;
  const filters = resolveReportFilters(
    {
      ...raw,
      view: "financial-summary",
      period,
      start: monthStart ?? raw.start,
    },
    options,
  );
  const snapshot = await getFinancialSnapshot(filters);
  const selectedYear = options.academicYears.find(
    (year) => year.id === filters.academicYearId,
  );
  const selectedTerm = options.academicTerms.find(
    (term) => term.id === filters.academicTermId,
  );
  const periodLabel =
    filters.period === "monthly"
      ? monthLabel.format(new Date(`${filters.start}T00:00:00Z`))
      : filters.period === "academic-cycle"
        ? `${selectedYear?.name ?? "Academic cycle"} · Academic cycle`
        : `${selectedYear?.name ?? "Academic year"} · ${selectedTerm?.name ?? "Current term"}`;

  return {
    snapshot,
    filters,
    options: {
      academicYears: options.academicYears,
      academicTerms: options.academicTerms,
    },
    periodLabel,
    trend: filters.period === "monthly" ? snapshot.daily : snapshot.monthly,
    trendGranularity: filters.period === "monthly" ? "day" : "month",
  };
}

export async function getFinancialDashboardData(
  raw: RawQuery,
  includeOutstanding: boolean,
) {
  const options = await getReportingOptions();
  const filters = resolveReportFilters(
    { view: "outstanding", classId: raw.classId },
    options,
  );
  const [snapshot, outstanding] = await Promise.all([
    getFinancialSnapshot(filters),
    includeOutstanding ? getReportTable(filters, 10) : Promise.resolve(null),
  ]);
  const selectedTerm = options.academicTerms.find(
    (term) => term.id === filters.academicTermId,
  );
  return {
    snapshot,
    outstanding,
    classes: options.classes,
    classId: filters.classId,
    periodLabel: `${selectedTerm?.name ?? "Current period"} · ${filters.start} to ${filters.end}`,
  };
}

export async function getAdministratorDashboardData(): Promise<AdministratorDashboardData> {
  const supabase = await createServerSupabaseClient();
  const currentTerm = await supabase
    .from("academic_terms")
    .select("id,name,starts_on,ends_on,academic_year_id")
    .eq("is_current", true)
    .maybeSingle();
  if (currentTerm.error) throw new Error(dashboardError);

  const year = currentTerm.data
    ? await supabase
        .from("academic_years")
        .select("name")
        .eq("id", currentTerm.data.academic_year_id)
        .maybeSingle()
    : { data: null, error: null };
  if (year.error) throw new Error(dashboardError);

  const admissionDatesAvailable = Boolean(
    currentTerm.data?.starts_on && currentTerm.data.ends_on,
  );
  const admissionsRequest = admissionDatesAvailable
    ? supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .gte("admission_date", currentTerm.data?.starts_on ?? "")
        .lte("admission_date", currentTerm.data?.ends_on ?? "")
    : Promise.resolve({ count: 0, error: null });

  let outstandingRequest = supabase
    .from("invoices")
    .select(
      "id,student_id,invoice_number,student_name_snapshot,admission_number_snapshot,class_name_snapshot,location_name_snapshot,academic_year_name_snapshot,academic_term_name_snapshot,total,amount_paid,outstanding,status,issued_on",
      { count: "exact" },
    )
    .in("status", ["unpaid", "partially_paid"])
    .gt("outstanding", 0);
  if (currentTerm.data)
    outstandingRequest = outstandingRequest.eq(
      "academic_term_id",
      currentTerm.data.id,
    );

  const [students, admissions, staff, teachers, outstanding] =
    await Promise.all([
      supabase
        .from("student_directory")
        .select("id,class_id,class_name", { count: "exact" })
        .eq("status", "active")
        .order("class_name")
        .order("id")
        .limit(1000),
      admissionsRequest,
      supabase
        .from("staff")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("staff")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .eq("staff_type", "teaching"),
      outstandingRequest
        .order("outstanding", { ascending: false })
        .order("id", { ascending: false })
        .limit(8),
    ]);
  if (
    students.error ||
    admissions.error ||
    staff.error ||
    teachers.error ||
    outstanding.error
  )
    throw new Error(dashboardError);

  const classTotals = new Map<
    number,
    { className: string; studentCount: number }
  >();
  for (const student of students.data) {
    if (student.class_id == null || !student.class_name) continue;
    const existing = classTotals.get(student.class_id);
    classTotals.set(student.class_id, {
      className: student.class_name,
      studentCount: (existing?.studentCount ?? 0) + 1,
    });
  }

  const outstandingRows: OutstandingInvoiceRow[] = outstanding.data.map(
    (row) => ({
      id: row.id,
      studentId: row.student_id,
      invoiceNumber: row.invoice_number,
      studentName: row.student_name_snapshot,
      admissionNumber: row.admission_number_snapshot,
      className: row.class_name_snapshot,
      locationName: row.location_name_snapshot,
      academicYearName: row.academic_year_name_snapshot,
      academicTermName: row.academic_term_name_snapshot,
      total: money(row.total),
      amountPaid: money(row.amount_paid),
      outstanding: money(row.outstanding),
      status: row.status as OutstandingInvoiceRow["status"],
      issuedOn: row.issued_on,
    }),
  );

  return {
    activeStudents: students.count ?? 0,
    admissionsThisTerm: admissions.count ?? 0,
    activeStaff: staff.count ?? 0,
    teachingStaff: teachers.count ?? 0,
    openBalances: outstanding.count ?? 0,
    currentTermLabel: currentTerm.data
      ? `${year.data?.name ?? "Academic year"} · ${currentTerm.data.name}`
      : "No current term",
    classEnrollment: [...classTotals.entries()]
      .map(([classId, value]) => ({ classId, ...value }))
      .sort(
        (left, right) =>
          right.studentCount - left.studentCount ||
          left.className.localeCompare(right.className),
      ),
    outstandingRows,
  };
}

export async function getSuperAdminOperationsData(): Promise<SuperAdminOperationsData> {
  const supabase = await createServerSupabaseClient();
  const currentTerm = await supabase
    .from("academic_terms")
    .select("id,name,academic_year_id")
    .eq("is_current", true)
    .maybeSingle();
  if (currentTerm.error) throw new Error(dashboardError);

  const [students, staff, classes, accounts, year, libraryCharges] =
    await Promise.all([
      supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("staff")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("classes")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      currentTerm.data
        ? supabase
            .from("academic_years")
            .select("name")
            .eq("id", currentTerm.data.academic_year_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      currentTerm.data
        ? supabase
            .from("library_charges")
            .select("expected_amount,amount_paid")
            .eq("academic_term_id", currentTerm.data.id)
            .limit(5000)
        : Promise.resolve({ data: [], error: null }),
    ]);
  if (
    students.error ||
    staff.error ||
    classes.error ||
    accounts.error ||
    year.error ||
    libraryCharges.error
  )
    throw new Error(dashboardError);

  const libraryOutstandingCents = libraryCharges.data.reduce(
    (total, charge) =>
      total +
      Math.round(charge.expected_amount * 100) -
      Math.round(charge.amount_paid * 100),
    0,
  );

  return {
    activeStudents: students.count ?? 0,
    activeStaff: staff.count ?? 0,
    activeClasses: classes.count ?? 0,
    activeAccounts: accounts.count ?? 0,
    libraryOutstanding: (libraryOutstandingCents / 100).toFixed(2),
    libraryTermLabel: currentTerm.data
      ? `${year.data?.name ?? "Academic year"} · ${currentTerm.data.name}`
      : "No current term",
  };
}
