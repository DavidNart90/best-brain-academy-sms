import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildFinancialPeriodSummary } from "../period-summary";
import { reportQuerySchema } from "../schemas";
import type {
  FinancialActivityRow,
  FinancialBreakdown,
  FinancialSnapshot,
  FinancialSummary,
  FinancialTrendPoint,
  RecentCollection,
  ReportAccess,
  ReportFilters,
  ReportingPeriod,
  ReportTable,
  ReportView,
} from "../types";

const reportError =
  "The report could not be loaded. Check the filters and try again.";
const pageSize = 25;
const exportLimit = 10_000;

type RawQuery = Record<string, string | string[] | undefined>;
type UnknownRecord = Record<string, unknown>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function asMoney(value: unknown) {
  return asNumber(value).toFixed(2);
}

function asText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function nullableText(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function clampDate(value: string, minimum: string, maximum: string) {
  if (value < minimum) return minimum;
  if (value > maximum) return maximum;
  return value;
}

function dateFromIso(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function isoFromDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addDays(value: string, days: number) {
  const date = dateFromIso(value);
  date.setUTCDate(date.getUTCDate() + days);
  return isoFromDate(date);
}

function mondayFor(value: string) {
  const date = dateFromIso(value);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  return addDays(value, -daysSinceMonday);
}

function monthBounds(value: string) {
  const date = dateFromIso(value);
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
  );
  const end = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  );
  return { start: isoFromDate(start), end: isoFromDate(end) };
}

function normalizeBreakdown(value: unknown): FinancialBreakdown[] {
  return asArray(value).map((entry) => {
    const row = asRecord(entry);
    return {
      label: asText(row.label, "Uncategorized"),
      count: asNumber(row.count),
      amount: asMoney(row.amount),
    };
  });
}

function normalizeTrend(value: unknown): FinancialTrendPoint[] {
  return asArray(value).map((entry) => {
    const row = asRecord(entry);
    return {
      periodStart: asText(row.periodStart),
      grossReceipts: asNumber(row.grossReceipts),
      expenses: asNumber(row.expenses),
      salaryDeductions: asNumber(row.salaryDeductions),
      operatingNet: asNumber(row.operatingNet),
      finalPosition: asNumber(row.finalPosition),
    };
  });
}

function normalizeSnapshot(value: unknown): FinancialSnapshot {
  const snapshot = asRecord(value);
  const period = asRecord(snapshot.period);
  const summary = asRecord(snapshot.summary);
  const normalizedSummary: FinancialSummary = {
    expectedFees: asMoney(summary.expectedFees),
    schoolFeesCollected: asMoney(summary.schoolFeesCollected),
    outstandingFees: asMoney(summary.outstandingFees),
    feedingCollected: asMoney(summary.feedingCollected),
    admissionCollected: asMoney(summary.admissionCollected),
    miscellaneousCollected: asMoney(summary.miscellaneousCollected),
    grossReceipts: asMoney(summary.grossReceipts),
    totalExpenses: asMoney(summary.totalExpenses),
    operatingNet: asMoney(summary.operatingNet),
    salaryDeductions: asMoney(summary.salaryDeductions),
    finalPosition: asMoney(summary.finalPosition),
    receiptCount: asNumber(summary.receiptCount),
    expenseCount: asNumber(summary.expenseCount),
    deductionCount: asNumber(summary.deductionCount),
    reversalCount: asNumber(summary.reversalCount),
  };
  const recentCollections: RecentCollection[] = asArray(
    snapshot.recentCollections,
  ).map((entry) => {
    const row = asRecord(entry);
    return {
      source: asText(row.source),
      reference: asText(row.reference),
      businessDate: asText(row.businessDate),
      amount: asMoney(row.amount),
      personName: asText(row.personName, "Unattributed payer"),
      className: nullableText(row.className),
      paymentMethod: asText(row.paymentMethod, "Not recorded"),
    };
  });
  return {
    period: {
      start: asText(period.start),
      end: asText(period.end),
      academicYearId: period.academicYearId
        ? asNumber(period.academicYearId)
        : null,
      academicTermId: period.academicTermId
        ? asNumber(period.academicTermId)
        : null,
    },
    summary: normalizedSummary,
    daily: normalizeTrend(snapshot.daily),
    monthly: normalizeTrend(snapshot.monthly),
    incomeBreakdown: normalizeBreakdown(snapshot.incomeBreakdown),
    expenseBreakdown: normalizeBreakdown(snapshot.expenseBreakdown),
    deductionBreakdown: normalizeBreakdown(snapshot.deductionBreakdown),
    classCollections: normalizeBreakdown(snapshot.classCollections),
    reversals: normalizeBreakdown(snapshot.reversals),
    recentCollections,
  };
}

export async function getReportingOptions(): Promise<ReportingPeriod> {
  const supabase = await createServerSupabaseClient();
  const [years, terms, classes, students, staff, methods, expenseCategories] =
    await Promise.all([
      supabase
        .from("academic_years")
        .select("id,name,starts_on,ends_on,is_current")
        .eq("status", "active")
        .order("starts_on", { ascending: false })
        .limit(25),
      supabase
        .from("academic_terms")
        .select("id,academic_year_id,name,starts_on,ends_on,is_current,status")
        .eq("status", "active")
        .order("starts_on", { ascending: false })
        .limit(100),
      supabase
        .from("classes")
        .select("id,name")
        .eq("status", "active")
        .order("sort_order")
        .limit(100),
      supabase
        .from("student_directory")
        .select("id,full_name,admission_number")
        .eq("status", "active")
        .order("full_name")
        .limit(500),
      supabase
        .from("staff_directory")
        .select("id,full_name,staff_number")
        .eq("status", "active")
        .order("full_name")
        .limit(500),
      supabase
        .from("payment_methods")
        .select("id,name")
        .eq("status", "active")
        .order("sort_order")
        .limit(50),
      supabase
        .from("expense_categories")
        .select("id,name")
        .eq("status", "active")
        .order("sort_order")
        .limit(100),
    ]);
  if (
    years.error ||
    terms.error ||
    classes.error ||
    students.error ||
    staff.error ||
    methods.error ||
    expenseCategories.error
  )
    throw new Error(reportError);
  return {
    academicYears: years.data.map((year) => ({
      id: year.id,
      name: year.name,
      startsOn: year.starts_on,
      endsOn: year.ends_on,
      isCurrent: year.is_current,
    })),
    academicTerms: terms.data.flatMap((term) =>
      term.starts_on && term.ends_on
        ? [
            {
              id: term.id,
              academicYearId: term.academic_year_id,
              name: term.name,
              startsOn: term.starts_on,
              endsOn: term.ends_on,
              isCurrent: term.is_current,
            },
          ]
        : [],
    ),
    classes: classes.data,
    students: students.data.map((student) => ({
      id: Number(student.id),
      name: student.full_name ?? "Unnamed student",
      admissionNumber: student.admission_number ?? "",
    })),
    staff: staff.data.map((person) => ({
      id: Number(person.id),
      name: person.full_name ?? "Unnamed staff member",
      staffNumber: person.staff_number ?? "",
    })),
    paymentMethods: methods.data,
    expenseCategories: expenseCategories.data,
  };
}

export function resolveReportFilters(
  raw: RawQuery,
  options: ReportingPeriod,
): ReportFilters {
  const parsed = reportQuerySchema.parse({
    view: firstValue(raw.view),
    period: firstValue(raw.period),
    start: firstValue(raw.start),
    end: firstValue(raw.end),
    academicYearId: firstValue(raw.academicYearId),
    academicTermId: firstValue(raw.academicTermId),
    classId: firstValue(raw.classId),
    studentId: firstValue(raw.studentId),
    staffId: firstValue(raw.staffId),
    paymentMethodId: firstValue(raw.paymentMethodId),
    expenseCategoryId: firstValue(raw.expenseCategoryId),
    status: firstValue(raw.status),
    page: firstValue(raw.page),
  });
  const termFilterWasProvided = raw.academicTermId !== undefined;
  let selectedTerm = parsed.academicTermId
    ? options.academicTerms.find((term) => term.id === parsed.academicTermId)
    : termFilterWasProvided
      ? undefined
      : options.academicTerms.find((term) => term.isCurrent);
  let selectedYear = parsed.academicYearId
    ? options.academicYears.find((year) => year.id === parsed.academicYearId)
    : selectedTerm
      ? options.academicYears.find(
          (year) => year.id === selectedTerm?.academicYearId,
        )
      : options.academicYears.find((year) => year.isCurrent);

  if (
    parsed.view === "financial-summary" &&
    parsed.period === "academic-cycle"
  ) {
    selectedTerm = undefined;
    selectedYear ??= options.academicYears[0];
    const minimum =
      selectedYear?.startsOn ?? `${new Date().getUTCFullYear()}-01-01`;
    const maximum =
      selectedYear?.endsOn ?? `${new Date().getUTCFullYear()}-12-31`;
    return {
      ...parsed,
      start: minimum,
      end: clampDate(todayDate(), minimum, maximum),
      academicYearId: selectedYear?.id,
      academicTermId: undefined,
    };
  }

  if (parsed.view === "financial-summary" && parsed.period === "weekly") {
    const start = mondayFor(parsed.start ?? todayDate());
    return {
      ...parsed,
      start,
      end: addDays(start, 4),
      academicYearId: undefined,
      academicTermId: undefined,
    };
  }

  if (parsed.view === "financial-summary" && parsed.period === "monthly") {
    const bounds = monthBounds(parsed.start ?? todayDate());
    return {
      ...parsed,
      ...bounds,
      academicYearId: undefined,
      academicTermId: undefined,
    };
  }

  if (parsed.view === "financial-summary" && parsed.period === "term") {
    if (selectedYear && selectedTerm?.academicYearId !== selectedYear.id) {
      selectedTerm =
        options.academicTerms.find(
          (term) => term.academicYearId === selectedYear?.id && term.isCurrent,
        ) ??
        options.academicTerms.find(
          (term) => term.academicYearId === selectedYear?.id,
        );
    }
    selectedTerm ??= options.academicTerms.find((term) => term.isCurrent);
    if (selectedTerm) {
      selectedYear = options.academicYears.find(
        (year) => year.id === selectedTerm?.academicYearId,
      );
      return {
        ...parsed,
        start: selectedTerm.startsOn,
        end: clampDate(todayDate(), selectedTerm.startsOn, selectedTerm.endsOn),
        academicYearId: selectedTerm.academicYearId,
        academicTermId: selectedTerm.id,
      };
    }
  }

  const academicYearId = parsed.academicYearId ?? selectedTerm?.academicYearId;
  const minimum =
    selectedTerm?.startsOn ?? `${new Date().getUTCFullYear()}-01-01`;
  const maximum =
    selectedTerm?.endsOn ?? `${new Date().getUTCFullYear()}-12-31`;
  const current = clampDate(todayDate(), minimum, maximum);
  const start = parsed.start ?? minimum;
  const end = parsed.end ?? current;
  if (end < start)
    throw new Error("The report end date cannot be before its start date.");
  const duration =
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
    86_400_000;
  if (!Number.isFinite(duration) || duration > 730)
    throw new Error("Report ranges cannot exceed two years.");
  return {
    view: parsed.view,
    period: parsed.period,
    start,
    end,
    academicYearId,
    academicTermId: parsed.academicTermId ?? selectedTerm?.id,
    classId: parsed.classId,
    studentId: parsed.studentId,
    staffId: parsed.staffId,
    paymentMethodId: parsed.paymentMethodId,
    expenseCategoryId: parsed.expenseCategoryId,
    status: parsed.status,
    page: parsed.page,
  };
}

export async function getFinancialSnapshot(filters: ReportFilters) {
  const supabase = await createServerSupabaseClient();
  const result = await supabase.rpc("get_financial_reporting_snapshot", {
    report_start: filters.start,
    report_end: filters.end,
    target_academic_year_id: filters.academicYearId,
    target_academic_term_id: filters.academicTermId,
  });
  if (result.error) throw new Error(reportError);
  return normalizeSnapshot(result.data);
}

function reportKindForView(view: ReportView) {
  if (view === "collections") return "income";
  if (view === "payments") return "income";
  if (view === "expenses") return "expense";
  if (view === "salary-deductions") return "deduction";
  return null;
}

async function getFinancialActivityTable(
  filters: ReportFilters,
  requestedLimit = pageSize,
): Promise<ReportTable> {
  const supabase = await createServerSupabaseClient();
  const limit = Math.min(Math.max(requestedLimit, 1), exportLimit);
  const offset =
    requestedLimit === pageSize ? (filters.page - 1) * pageSize : 0;
  let request = supabase
    .from("financial_activity_report")
    .select("*", { count: "exact" })
    .gte("business_date", filters.start)
    .lte("business_date", filters.end);
  const kind = reportKindForView(filters.view);
  if (kind) request = request.eq("record_kind", kind);
  if (filters.view === "payments")
    request = request.eq("source", "School fees");
  if (filters.status !== "all") request = request.eq("status", filters.status);
  if (filters.academicYearId && filters.view === "payments")
    request = request.eq("academic_year_id", filters.academicYearId);
  if (filters.academicTermId && filters.view === "payments")
    request = request.eq("academic_term_id", filters.academicTermId);
  if (filters.classId && filters.view === "payments")
    request = request.eq("class_id", filters.classId);
  if (filters.studentId) request = request.eq("student_id", filters.studentId);
  if (filters.staffId) request = request.eq("staff_id", filters.staffId);
  if (filters.paymentMethodId && filters.view !== "salary-deductions")
    request = request.eq("payment_method_id", filters.paymentMethodId);
  if (filters.expenseCategoryId && filters.view === "expenses")
    request = request.eq("expense_category_id", filters.expenseCategoryId);
  const result = await request
    .order("business_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (result.error) throw new Error(reportError);
  const mapped: FinancialActivityRow[] = result.data.map((row) => ({
    id: Number(row.record_id),
    kind:
      row.record_kind === "expense"
        ? "expense"
        : row.record_kind === "deduction"
          ? "deduction"
          : "income",
    source: row.source ?? "Unknown",
    reference: row.reference ?? "",
    documentReference: row.document_reference,
    personName: row.person_name,
    category: row.category ?? "Uncategorized",
    className: row.class_name,
    amount: asMoney(row.amount),
    businessDate: row.business_date ?? "",
    status: row.status ?? "unknown",
    paymentMethod: row.payment_method,
    reversalReference: row.reversal_reference,
    reversalReason: row.reversal_reason,
  }));
  const labels = {
    collections: [
      "Collection report",
      "Posted school-fee, feeding, admission, and miscellaneous receipts.",
    ],
    payments: [
      "Payment report",
      "School-fee payments with student and class snapshots.",
    ],
    expenses: [
      "Expense report",
      "Posted expenses grouped through their recorded category snapshots.",
    ],
    "salary-deductions": [
      "Payroll deduction report",
      "Monthly SSNIT and other configured staff deductions. The unresolved August source batch remains unposted.",
    ],
  } as const;
  const [title, description] =
    labels[filters.view as keyof typeof labels] ?? labels.collections;
  return {
    title,
    description,
    columns: [
      { key: "businessDate", label: "Date" },
      { key: "reference", label: "Reference" },
      { key: "source", label: "Source" },
      { key: "personName", label: "Student / Staff / Payer" },
      { key: "category", label: "Category" },
      { key: "className", label: "Class" },
      { key: "paymentMethod", label: "Payment method" },
      { key: "amount", label: "Amount", align: "right" },
      { key: "status", label: "Status" },
    ],
    rows: mapped,
    total: result.count ?? 0,
    page: requestedLimit === pageSize ? filters.page : 1,
    pageSize: limit,
  };
}

async function getInvoiceTable(
  filters: ReportFilters,
  outstandingOnly: boolean,
  requestedLimit = pageSize,
): Promise<ReportTable> {
  const supabase = await createServerSupabaseClient();
  const limit = Math.min(Math.max(requestedLimit, 1), exportLimit);
  const offset =
    requestedLimit === pageSize ? (filters.page - 1) * pageSize : 0;
  let request = supabase
    .from("invoices")
    .select(
      "id,invoice_number,student_name_snapshot,admission_number_snapshot,class_name_snapshot,total,amount_paid,outstanding,status,issued_on",
      { count: "exact" },
    );
  if (!filters.academicTermId)
    request = request
      .gte("issued_on", filters.start)
      .lte("issued_on", filters.end);
  if (outstandingOnly) {
    request = request
      .in("status", ["unpaid", "partially_paid"])
      .gt("outstanding", 0);
  } else if (filters.status === "active") {
    request = request.neq("status", "cancelled");
  } else if (filters.status === "reversed") {
    request = request.eq("status", "cancelled");
  }
  if (filters.academicYearId)
    request = request.eq("academic_year_id", filters.academicYearId);
  if (filters.academicTermId)
    request = request.eq("academic_term_id", filters.academicTermId);
  if (filters.classId) request = request.eq("class_id", filters.classId);
  if (filters.studentId) request = request.eq("student_id", filters.studentId);
  const result = await request
    .order(outstandingOnly ? "outstanding" : "issued_on", {
      ascending: false,
    })
    .order("id", { ascending: false })
    .range(offset, offset + limit - 1);
  if (result.error) throw new Error(reportError);
  return {
    title: outstandingOnly ? "Outstanding fees report" : "Invoice report",
    description: outstandingOnly
      ? "Current balances for invoices assigned to the selected term, or issued in the selected dates when no term is chosen."
      : "Issued invoices with billed, paid, and current outstanding amounts.",
    columns: [
      { key: "issuedOn", label: "Issued" },
      { key: "invoiceNumber", label: "Invoice" },
      { key: "student", label: "Student" },
      { key: "admissionNumber", label: "Admission no." },
      { key: "className", label: "Class" },
      { key: "total", label: "Billed", align: "right" },
      { key: "amountPaid", label: "Paid", align: "right" },
      { key: "outstanding", label: "Outstanding", align: "right" },
      { key: "status", label: "Status" },
    ],
    rows: result.data.map((row) => ({
      id: row.id,
      issuedOn: row.issued_on,
      invoiceNumber: row.invoice_number,
      student: row.student_name_snapshot,
      admissionNumber: row.admission_number_snapshot,
      className: row.class_name_snapshot,
      total: asMoney(row.total),
      amountPaid: asMoney(row.amount_paid),
      outstanding: asMoney(row.outstanding),
      status: row.status,
    })),
    total: result.count ?? 0,
    page: requestedLimit === pageSize ? filters.page : 1,
    pageSize: limit,
  };
}

async function getStudentStatement(
  filters: ReportFilters,
): Promise<ReportTable> {
  if (!filters.studentId)
    return {
      title: "Student account statement",
      description: "Choose a student to view billed fees and active payments.",
      columns: [],
      rows: [],
      total: 0,
      page: 1,
      pageSize: 200,
    };
  const supabase = await createServerSupabaseClient();
  let invoiceRequest = supabase
    .from("invoices")
    .select(
      "id,invoice_number,total,status,issued_on,class_name_snapshot,academic_year_id,academic_term_id",
    )
    .eq("student_id", filters.studentId)
    .neq("status", "cancelled");
  if (!filters.academicTermId)
    invoiceRequest = invoiceRequest
      .gte("issued_on", filters.start)
      .lte("issued_on", filters.end);
  if (filters.academicYearId)
    invoiceRequest = invoiceRequest.eq(
      "academic_year_id",
      filters.academicYearId,
    );
  if (filters.academicTermId)
    invoiceRequest = invoiceRequest.eq(
      "academic_term_id",
      filters.academicTermId,
    );
  const invoices = await invoiceRequest.order("issued_on").limit(200);
  if (invoices.error) throw new Error(reportError);
  const invoiceIds = invoices.data.map((invoice) => invoice.id);
  const payments = invoiceIds.length
    ? await supabase
        .from("payments")
        .select("id,payment_number,invoice_id,amount,business_date,status")
        .in("invoice_id", invoiceIds)
        .eq("status", "active")
        .gte("business_date", filters.start)
        .lte("business_date", filters.end)
        .order("business_date")
        .limit(500)
    : { data: [], error: null };
  if (payments.error) throw new Error(reportError);
  const entries = [
    ...invoices.data.map((invoice) => ({
      date: invoice.issued_on,
      order: 0,
      reference: invoice.invoice_number,
      description: `Invoice · ${invoice.class_name_snapshot}`,
      debitCents: Math.round(Number(invoice.total) * 100),
      creditCents: 0,
      status: invoice.status,
    })),
    ...payments.data.map((payment) => ({
      date: payment.business_date,
      order: 1,
      reference: payment.payment_number,
      description: "School-fee payment",
      debitCents: 0,
      creditCents: Math.round(Number(payment.amount) * 100),
      status: payment.status,
    })),
  ].sort(
    (left, right) =>
      left.date.localeCompare(right.date) || left.order - right.order,
  );
  let balanceCents = 0;
  const rows = entries.map((entry) => {
    balanceCents += entry.debitCents - entry.creditCents;
    return {
      date: entry.date,
      reference: entry.reference,
      description: entry.description,
      debit: (entry.debitCents / 100).toFixed(2),
      credit: (entry.creditCents / 100).toFixed(2),
      balance: (balanceCents / 100).toFixed(2),
      status: entry.status,
    };
  });
  return {
    title: "Student account statement",
    description:
      "Invoices add to the balance; active school-fee payments reduce it.",
    columns: [
      { key: "date", label: "Date" },
      { key: "reference", label: "Reference" },
      { key: "description", label: "Description" },
      { key: "debit", label: "Billed", align: "right" },
      { key: "credit", label: "Paid", align: "right" },
      { key: "balance", label: "Balance", align: "right" },
      { key: "status", label: "Status" },
    ],
    rows,
    total: rows.length,
    page: 1,
    pageSize: 200,
  };
}

async function getStudentTable(
  filters: ReportFilters,
  view: "students" | "admissions",
  requestedLimit = pageSize,
): Promise<ReportTable> {
  const supabase = await createServerSupabaseClient();
  const limit = Math.min(Math.max(requestedLimit, 1), exportLimit);
  const offset =
    requestedLimit === pageSize ? (filters.page - 1) * pageSize : 0;
  let request = supabase
    .from("student_directory")
    .select(
      "id,admission_number,full_name,gender,admission_date,status,academic_year_id,academic_term_id,class_id,class_name,guardian_name,guardian_phone",
      { count: "exact" },
    );
  if (view === "admissions")
    request = request
      .gte("admission_date", filters.start)
      .lte("admission_date", filters.end);
  if (filters.academicYearId)
    request = request.eq("academic_year_id", filters.academicYearId);
  if (filters.academicTermId)
    request = request.eq("academic_term_id", filters.academicTermId);
  if (filters.classId) request = request.eq("class_id", filters.classId);
  if (filters.studentId) request = request.eq("id", filters.studentId);
  const result = await request
    .order(view === "admissions" ? "admission_date" : "full_name", {
      ascending: view !== "admissions",
    })
    .order("id")
    .range(offset, offset + limit - 1);
  if (result.error) throw new Error(reportError);
  return {
    title: view === "admissions" ? "Admission report" : "Student list",
    description:
      view === "admissions"
        ? "Students admitted during the selected dates."
        : "Current student directory with enrollment context.",
    columns: [
      { key: "admissionNumber", label: "Admission no." },
      { key: "fullName", label: "Student" },
      { key: "gender", label: "Gender" },
      { key: "className", label: "Class" },
      { key: "admissionDate", label: "Admission date" },
      { key: "guardianName", label: "Guardian" },
      { key: "guardianPhone", label: "Phone" },
      { key: "status", label: "Status" },
    ],
    rows: result.data.map((row) => ({
      id: row.id,
      admissionNumber: row.admission_number,
      fullName: row.full_name,
      gender: row.gender,
      className: row.class_name,
      admissionDate: row.admission_date,
      guardianName: row.guardian_name,
      guardianPhone: row.guardian_phone,
      status: row.status,
    })),
    total: result.count ?? 0,
    page: requestedLimit === pageSize ? filters.page : 1,
    pageSize: limit,
  };
}

async function getStudentsByClass(
  filters: ReportFilters,
): Promise<ReportTable> {
  const supabase = await createServerSupabaseClient();
  let request = supabase
    .from("student_directory")
    .select("class_id,class_name,status")
    .eq("status", "active")
    .limit(1_000);
  if (filters.academicYearId)
    request = request.eq("academic_year_id", filters.academicYearId);
  if (filters.academicTermId)
    request = request.eq("academic_term_id", filters.academicTermId);
  if (filters.classId) request = request.eq("class_id", filters.classId);
  const result = await request;
  if (result.error) throw new Error(reportError);
  const counts = new Map<string, number>();
  for (const row of result.data) {
    const name = row.class_name ?? "Unassigned";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const rows = [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([className, students]) => ({ className, students }));
  return {
    title: "Students by class",
    description: "Active enrollment count for each class.",
    columns: [
      { key: "className", label: "Class" },
      { key: "students", label: "Active students", align: "right" },
    ],
    rows,
    total: rows.length,
    page: 1,
    pageSize: rows.length || 1,
  };
}

async function getStaffTable(
  filters: ReportFilters,
  requestedLimit = pageSize,
): Promise<ReportTable> {
  const supabase = await createServerSupabaseClient();
  const limit = Math.min(Math.max(requestedLimit, 1), exportLimit);
  const offset =
    requestedLimit === pageSize ? (filters.page - 1) * pageSize : 0;
  let request = supabase
    .from("staff_directory")
    .select(
      "id,staff_number,full_name,staff_type,position,assigned_classes,phone,email,status",
      { count: "exact" },
    );
  if (filters.staffId) request = request.eq("id", filters.staffId);
  const result = await request
    .order("full_name")
    .order("id")
    .range(offset, offset + limit - 1);
  if (result.error) throw new Error(reportError);
  return {
    title: "Staff list",
    description: "Teaching and non-teaching staff with current assignments.",
    columns: [
      { key: "staffNumber", label: "Staff no." },
      { key: "fullName", label: "Staff member" },
      { key: "staffType", label: "Type" },
      { key: "position", label: "Position" },
      { key: "assignedClasses", label: "Classes" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "status", label: "Status" },
    ],
    rows: result.data.map((row) => ({
      id: row.id,
      staffNumber: row.staff_number,
      fullName: row.full_name,
      staffType:
        row.staff_type === "non_teaching" ? "Non-teaching" : "Teaching",
      position: row.position,
      assignedClasses: row.assigned_classes,
      phone: row.phone,
      email: row.email,
      status: row.status,
    })),
    total: result.count ?? 0,
    page: requestedLimit === pageSize ? filters.page : 1,
    pageSize: limit,
  };
}

async function getClassTable(requestedLimit = pageSize): Promise<ReportTable> {
  const supabase = await createServerSupabaseClient();
  const limit = Math.min(Math.max(requestedLimit, 1), exportLimit);
  const result = await supabase
    .from("classes")
    .select("id,code,name,class_group,sort_order,status", { count: "exact" })
    .order("sort_order")
    .limit(limit);
  if (result.error) throw new Error(reportError);
  return {
    title: "Class list",
    description: "Configured classes in their operational order.",
    columns: [
      { key: "code", label: "Code" },
      { key: "name", label: "Class" },
      { key: "group", label: "Group" },
      { key: "sortOrder", label: "Order", align: "right" },
      { key: "status", label: "Status" },
    ],
    rows: result.data.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      group: row.class_group,
      sortOrder: row.sort_order,
      status: row.status,
    })),
    total: result.count ?? 0,
    page: 1,
    pageSize: limit,
  };
}

export async function getReportTable(
  filters: ReportFilters,
  requestedLimit = pageSize,
): Promise<ReportTable | null> {
  if (filters.view === "financial-summary") return null;
  if (
    filters.view === "collections" ||
    filters.view === "payments" ||
    filters.view === "expenses" ||
    filters.view === "salary-deductions"
  )
    return getFinancialActivityTable(filters, requestedLimit);
  if (filters.view === "outstanding")
    return getInvoiceTable(filters, true, requestedLimit);
  if (filters.view === "invoices")
    return getInvoiceTable(filters, false, requestedLimit);
  if (filters.view === "student-statement") return getStudentStatement(filters);
  if (filters.view === "students" || filters.view === "admissions")
    return getStudentTable(filters, filters.view, requestedLimit);
  if (filters.view === "students-by-class") return getStudentsByClass(filters);
  if (filters.view === "staff") return getStaffTable(filters, requestedLimit);
  if (filters.view === "classes") return getClassTable(requestedLimit);
  return null;
}

export async function getReportPage(raw: RawQuery, access: ReportAccess) {
  const options = await getReportingOptions();
  const requestedView = firstValue(raw.view);
  const fallbackView: ReportView = access.financials
    ? "financial-summary"
    : access.students
      ? "students"
      : access.admissions
        ? "admissions"
        : access.staff
          ? "staff"
          : "classes";
  const filters = resolveReportFilters(
    requestedView ? raw : { ...raw, view: fallbackView },
    options,
  );
  const accessDenied = !canOpenReport(filters.view, access);
  const [snapshot, table] = await Promise.all([
    !accessDenied && filters.view === "financial-summary"
      ? getFinancialSnapshot(filters)
      : Promise.resolve(null),
    !accessDenied ? getReportTable(filters) : Promise.resolve(null),
  ]);
  const periodSummary = snapshot
    ? buildFinancialPeriodSummary(snapshot.daily, filters, options)
    : null;
  return { options, filters, snapshot, periodSummary, table, accessDenied };
}

export async function getReportExport(raw: RawQuery, access: ReportAccess) {
  const options = await getReportingOptions();
  const filters = resolveReportFilters(raw, options);
  if (!canOpenReport(filters.view, access))
    throw new Error("You do not have permission to export this report.");
  if (filters.view === "financial-summary") {
    const snapshot = await getFinancialSnapshot(filters);
    const periodSummary = buildFinancialPeriodSummary(
      snapshot.daily,
      filters,
      options,
    );
    return {
      filters,
      table: {
        title: periodSummary.title,
        description: periodSummary.description,
        columns: [
          { key: "period", label: "Period" },
          { key: "start", label: "From" },
          { key: "end", label: "To" },
          { key: "revenue", label: "Revenue", align: "right" as const },
          { key: "expenses", label: "Expenses", align: "right" as const },
          { key: "net", label: "Net", align: "right" as const },
        ],
        rows: [
          ...periodSummary.rows.map((row) => ({
            period: row.label,
            start: row.start,
            end: row.end,
            revenue: row.revenue,
            expenses: row.expenses,
            net: row.net,
          })),
          {
            period: "Total",
            start: filters.start,
            end: filters.end,
            revenue: periodSummary.total.revenue,
            expenses: periodSummary.total.expenses,
            net: periodSummary.total.net,
          },
        ],
        total: periodSummary.rows.length + 1,
        page: 1,
        pageSize: periodSummary.rows.length + 1,
      } satisfies ReportTable,
    };
  }
  const table = await getReportTable(filters, exportLimit);
  if (!table) throw new Error(reportError);
  return { filters, table };
}

function canOpenReport(view: ReportView, access: ReportAccess) {
  if (
    [
      "financial-summary",
      "collections",
      "outstanding",
      "invoices",
      "payments",
      "expenses",
      "salary-deductions",
    ].includes(view)
  )
    return access.financials;
  if (view === "student-statement") return access.financials && access.students;
  if (view === "students" || view === "students-by-class")
    return access.students;
  if (view === "admissions") return access.admissions;
  if (view === "staff") return access.staff;
  if (view === "classes") return access.classes;
  return false;
}
