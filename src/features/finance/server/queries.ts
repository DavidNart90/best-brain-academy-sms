import "server-only";

import { getInvoiceLibraryBalance } from "@/features/library/server/queries";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { TermRateConfigurationStatus } from "@/types/term-rate-configuration";
import {
  normalizeOutstandingQuery,
  type OutstandingSearchParams,
} from "../outstanding-query";
import { endTermInvoiceQuerySchema, invoiceListQuerySchema } from "../schemas";
import type {
  BaseClassFeeRow,
  EndTermInvoiceDocument,
  EndTermInvoicePage,
  EndTermInvoiceSetup,
  FinanceCategory,
  FinanceSettings,
  FlatFeeRow,
  InvoiceDetail,
  InvoiceListRow,
  OutstandingInvoiceRow,
  PaymentMethod,
  TransportChargeRow,
} from "../types";

const loadError =
  "Financial settings could not be loaded. Try again or contact an administrator.";

// The generated Row type maps NUMERIC(14,2) to `number`; format it back to an exact
// 2-decimal string for display, matching the app's decimal-string money convention.
function formatRateAmount(value: number) {
  return value.toFixed(2);
}

function safeDirectorySearch(value: string) {
  return value
    .replace(/[^\p{L}\p{N}\s@.+/-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export async function getFinancePeriods() {
  const supabase = await createServerSupabaseClient();
  const [terms, years] = await Promise.all([
    supabase
      .from("academic_terms")
      .select("id,name,academic_year_id,is_current")
      .order("starts_on", { ascending: false })
      .order("id", { ascending: false })
      .limit(150),
    supabase
      .from("academic_years")
      .select("id,name")
      .order("id", { ascending: false })
      .limit(50),
  ]);
  if (terms.error || years.error) throw new Error(loadError);
  return terms.data.map((term) => ({
    id: term.id,
    label: `${years.data.find((year) => year.id === term.academic_year_id)?.name ?? "Academic year"} · ${term.name}`,
    isCurrent: term.is_current,
  }));
}

export async function getFinanceSettings(
  academicTermId?: number,
): Promise<FinanceSettings> {
  const supabase = await createServerSupabaseClient();
  const termQuery = supabase
    .from("academic_terms")
    .select("id,name,academic_year_id");
  const [periods, term] = await Promise.all([
    getFinancePeriods(),
    (academicTermId
      ? termQuery.eq("id", academicTermId)
      : termQuery.eq("is_current", true)
    ).maybeSingle(),
  ]);
  if (term.error || !term.data) throw new Error(loadError);
  const year = await supabase
    .from("academic_years")
    .select("id,name")
    .eq("id", term.data.academic_year_id)
    .single();
  if (year.error || term.error || !year.data || !term.data)
    throw new Error(loadError);

  const [
    classes,
    locations,
    feeComponents,
    rates,
    methods,
    expenseCategories,
    miscCategories,
    rateConfiguration,
  ] = await Promise.all([
    supabase
      .from("classes")
      .select("id,name")
      .eq("status", "active")
      .order("sort_order")
      .limit(100),
    supabase
      .from("school_locations")
      .select("id,name")
      .eq("status", "active")
      .order("sort_order")
      .limit(100),
    supabase.from("fee_components").select("id,code").limit(50),
    supabase
      .from("fee_component_rates")
      .select("id,amount,class_id,school_location_id,fee_component_id")
      .eq("academic_year_id", year.data.id)
      .eq("academic_term_id", term.data.id)
      .eq("status", "active")
      .order("id")
      .limit(250),
    supabase
      .from("payment_methods")
      .select("id,code,name,requires_reference,sort_order,status")
      .order("sort_order")
      .limit(50),
    supabase
      .from("expense_categories")
      .select("id,code,name,sort_order,status")
      .eq("is_system", false)
      .order("sort_order")
      .limit(50),
    supabase
      .from("misc_income_categories")
      .select("id,code,name,sort_order,status")
      .order("sort_order")
      .limit(50),
    supabase
      .from("term_rate_configurations")
      .select("source_academic_term_id,status,approved_at")
      .eq("academic_term_id", term.data.id)
      .eq("domain", "school_fees")
      .maybeSingle(),
  ]);
  if (
    classes.error ||
    locations.error ||
    feeComponents.error ||
    rates.error ||
    methods.error ||
    expenseCategories.error ||
    miscCategories.error ||
    rateConfiguration.error
  )
    throw new Error(loadError);

  const componentCodeById = new Map(
    feeComponents.data.map((row) => [row.id, row.code]),
  );
  type RateRow = {
    id: number;
    amount: number;
    class_id: number | null;
    school_location_id: number | null;
    fee_component_id: number;
  };
  const rateRows: RateRow[] = rates.data;
  const rateFor = (code: string, predicate: (row: RateRow) => boolean) =>
    rateRows.find(
      (row) =>
        componentCodeById.get(row.fee_component_id) === code && predicate(row),
    );

  const baseClassFees: BaseClassFeeRow[] = classes.data.map((schoolClass) => {
    const rate = rateFor(
      "base_class_fee",
      (row) => row.class_id === schoolClass.id,
    );
    return {
      classId: schoolClass.id,
      className: schoolClass.name,
      rateId: rate?.id ?? null,
      amount: rate ? formatRateAmount(rate.amount) : null,
    };
  });

  const transportCharges: TransportChargeRow[] = locations.data.map(
    (location) => {
      const rate = rateFor(
        "location_transport_charge",
        (row) => row.school_location_id === location.id,
      );
      return {
        schoolLocationId: location.id,
        locationName: location.name,
        rateId: rate?.id ?? null,
        amount: rate ? formatRateAmount(rate.amount) : null,
      };
    },
  );

  const feedingRate = rateFor("feeding_fee", () => true);
  const admissionRate = rateFor("admission_fee", () => true);
  const flatFees: FlatFeeRow[] = [
    {
      code: "feeding_fee",
      name: "Feeding Fee",
      rateId: feedingRate?.id ?? null,
      amount: feedingRate ? formatRateAmount(feedingRate.amount) : null,
    },
    {
      code: "admission_fee",
      name: "Admission Fee",
      rateId: admissionRate?.id ?? null,
      amount: admissionRate ? formatRateAmount(admissionRate.amount) : null,
    },
  ];

  const paymentMethods: PaymentMethod[] = methods.data.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    requiresReference: row.requires_reference,
    sortOrder: row.sort_order,
    status: row.status as "active" | "archived",
  }));
  const mapCategory = (row: {
    id: number;
    code: string;
    name: string;
    sort_order: number;
    status: string;
  }): FinanceCategory => ({
    id: row.id,
    code: row.code,
    name: row.name,
    sortOrder: row.sort_order,
    status: row.status as "active" | "archived",
  });
  const selectedTermId = term.data.id;
  const selectedPeriodIndex = periods.findIndex(
    (period) => period.id === selectedTermId,
  );
  const previousPeriod =
    selectedPeriodIndex >= 0
      ? (periods[selectedPeriodIndex + 1] ?? null)
      : null;
  const sourcePeriod = rateConfiguration.data?.source_academic_term_id
    ? periods.find(
        (period) =>
          period.id === rateConfiguration.data?.source_academic_term_id,
      )
    : null;

  return {
    academicYearId: year.data.id,
    academicYearName: year.data.name,
    academicTermId: term.data.id,
    academicTermName: term.data.name,
    rateConfiguration: {
      status:
        (rateConfiguration.data?.status as "draft" | "approved" | undefined) ??
        "not_started",
      sourceTermId: rateConfiguration.data?.source_academic_term_id ?? null,
      sourceTermLabel: sourcePeriod?.label ?? null,
      previousTermId: previousPeriod?.id ?? null,
      previousTermLabel: previousPeriod?.label ?? null,
      approvedAt: rateConfiguration.data?.approved_at ?? null,
    },
    baseClassFees,
    transportCharges,
    flatFees,
    paymentMethods,
    expenseCategories: expenseCategories.data.map(mapCategory),
    miscIncomeCategories: miscCategories.data.map(mapCategory),
  };
}

const invoiceListColumns =
  "id,invoice_number,student_name_snapshot,admission_number_snapshot,class_name_snapshot,location_name_snapshot,academic_year_name_snapshot,academic_term_name_snapshot,total,amount_paid,outstanding,status,issued_on,academic_year_id,academic_term_id";
const invoiceError =
  "Invoices could not be loaded. Try again or contact an administrator.";

type InvoiceRow = {
  id: number;
  invoice_number: string;
  student_name_snapshot: string;
  admission_number_snapshot: string;
  class_name_snapshot: string;
  location_name_snapshot: string;
  academic_year_name_snapshot: string;
  academic_term_name_snapshot: string;
  total: number;
  amount_paid: number;
  outstanding: number;
  status: string;
  issued_on: string;
  academic_year_id: number;
  academic_term_id: number;
};

function mapInvoiceRow(row: InvoiceRow): InvoiceListRow {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    studentName: row.student_name_snapshot,
    admissionNumber: row.admission_number_snapshot,
    className: row.class_name_snapshot,
    locationName: row.location_name_snapshot,
    academicYearName: row.academic_year_name_snapshot,
    academicTermName: row.academic_term_name_snapshot,
    total: formatRateAmount(row.total),
    amountPaid: formatRateAmount(row.amount_paid),
    outstanding: formatRateAmount(row.outstanding),
    status: row.status as InvoiceListRow["status"],
    issuedOn: row.issued_on,
  };
}

export async function getInvoicesPage(
  raw: Record<string, string | string[] | undefined>,
) {
  const firstValue = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const query = invoiceListQuerySchema.parse({
    q: firstValue(raw.q),
    status: firstValue(raw.status),
    page: firstValue(raw.page),
  });
  const pageSize = 25;
  const offset = (query.page - 1) * pageSize;
  const supabase = await createServerSupabaseClient();
  let request = supabase
    .from("invoices")
    .select(invoiceListColumns, { count: "exact" });
  if (query.status !== "all") request = request.eq("status", query.status);
  if (query.q) {
    const safePattern = query.q.replace(/[^\p{L}\p{N}\s/-]/gu, " ").trim();
    if (safePattern)
      request = request.or(
        `invoice_number.ilike.%${safePattern}%,student_name_snapshot.ilike.%${safePattern}%,admission_number_snapshot.ilike.%${safePattern}%`,
      );
  }
  const result = await request
    .order("issued_on", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + pageSize - 1);
  if (result.error) throw new Error(invoiceError);
  const rows = result.data as unknown as InvoiceRow[];
  return {
    rows: rows.map((row) => mapInvoiceRow(row)),
    total: result.count ?? 0,
    page: query.page,
    pageSize,
    query,
  };
}

export async function getDailyCashflow(businessDate: string) {
  const supabase = await createServerSupabaseClient();
  const [payments, feeding, admission, miscellaneous, expenses] =
    await Promise.all([
      supabase
        .from("payments")
        .select("amount", { count: "exact" })
        .eq("business_date", businessDate)
        .eq("status", "active"),
      supabase
        .from("feeding_receipts")
        .select("amount", { count: "exact" })
        .eq("business_date", businessDate)
        .eq("status", "active"),
      supabase
        .from("admission_receipts")
        .select("amount", { count: "exact" })
        .eq("business_date", businessDate)
        .eq("status", "active"),
      supabase
        .from("misc_receipts")
        .select("amount", { count: "exact" })
        .eq("business_date", businessDate)
        .eq("status", "active"),
      supabase
        .from("expenses")
        .select("amount", { count: "exact" })
        .eq("business_date", businessDate)
        .eq("status", "active"),
    ]);
  if (
    payments.error ||
    feeding.error ||
    admission.error ||
    miscellaneous.error ||
    expenses.error
  )
    throw new Error(
      "Daily cashflow could not be loaded. Try again or contact an administrator.",
    );

  const sum = (rows: Array<{ amount: number }>) =>
    (
      rows.reduce(
        (totalCents, row) => totalCents + Math.round(row.amount * 100),
        0,
      ) / 100
    ).toFixed(2);
  const schoolFees = sum(payments.data);
  const feedingTotal = sum(feeding.data);
  const admissionTotal = sum(admission.data);
  const miscellaneousTotal = sum(miscellaneous.data);
  const expensesTotal = sum(expenses.data);
  const toCents = (value: string) => Math.round(Number(value) * 100);
  const gross = (
    (toCents(schoolFees) +
      toCents(feedingTotal) +
      toCents(admissionTotal) +
      toCents(miscellaneousTotal)) /
    100
  ).toFixed(2);

  return {
    schoolFees,
    feeding: feedingTotal,
    admission: admissionTotal,
    miscellaneous: miscellaneousTotal,
    grossReceipts: gross,
    expenses: expensesTotal,
    netCashflow: ((toCents(gross) - toCents(expensesTotal)) / 100).toFixed(2),
    schoolFeeCount: payments.count ?? 0,
    feedingCount: feeding.count ?? 0,
    admissionCount: admission.count ?? 0,
    miscellaneousCount: miscellaneous.count ?? 0,
    expenseCount: expenses.count ?? 0,
    entryCount:
      (payments.count ?? 0) +
      (feeding.count ?? 0) +
      (admission.count ?? 0) +
      (miscellaneous.count ?? 0) +
      (expenses.count ?? 0),
  };
}

export async function getCashflowFormOptions(businessDate: string) {
  const supabase = await createServerSupabaseClient();
  const [methods, expenseCategories, admissions, term, component] =
    await Promise.all([
      supabase
        .from("payment_methods")
        .select("id,name,requires_reference,status")
        .eq("status", "active")
        .order("sort_order")
        .limit(50),
      supabase
        .from("expense_categories")
        .select("id,code,name,status")
        .eq("is_system", false)
        .eq("status", "active")
        .order("sort_order")
        .limit(100),
      supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("admission_date", businessDate),
      supabase
        .from("academic_terms")
        .select("id,name,academic_year_id")
        .eq("status", "active")
        .lte("starts_on", businessDate)
        .gte("ends_on", businessDate)
        .order("is_current", { ascending: false })
        .order("starts_on", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("fee_components")
        .select("id")
        .eq("code", "admission_fee")
        .eq("status", "active")
        .maybeSingle(),
    ]);
  if (
    methods.error ||
    expenseCategories.error ||
    admissions.error ||
    term.error ||
    component.error
  )
    throw new Error(
      "Cashflow entry options could not be loaded. Try again or contact an administrator.",
    );

  const [year, admissionRate] = term.data
    ? await Promise.all([
        supabase
          .from("academic_years")
          .select("name")
          .eq("id", term.data.academic_year_id)
          .maybeSingle(),
        component.data
          ? supabase
              .from("fee_component_rates")
              .select("amount")
              .eq("fee_component_id", component.data.id)
              .eq("academic_year_id", term.data.academic_year_id)
              .eq("academic_term_id", term.data.id)
              .is("class_id", null)
              .is("school_location_id", null)
              .eq("status", "active")
              .order("id", { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ])
    : [
        { data: null, error: null },
        { data: null, error: null },
      ];
  if (year.error || admissionRate.error)
    throw new Error(
      "Admission-fee reconciliation could not be loaded. Try again or contact an administrator.",
    );

  const admissionCount = admissions.count ?? 0;
  const feePerAdmission = admissionRate.data
    ? Number(admissionRate.data.amount).toFixed(2)
    : null;
  return {
    paymentMethods: methods.data,
    expenseCategories: expenseCategories.data,
    admissionExpectation: {
      businessDate,
      admissionCount,
      feePerAdmission,
      expectedAmount:
        feePerAdmission === null
          ? null
          : (admissionCount * Number(feePerAdmission)).toFixed(2),
      termLabel: term.data
        ? `${year.data?.name ?? "Academic year"} · ${term.data.name}`
        : null,
    },
  };
}

export type FinanceReceiptRow = {
  id: number;
  receiptNumber: string;
  source: "School fee" | "Feeding" | "Admission" | "Miscellaneous";
  person: string;
  description: string;
  amount: string;
  businessDate: string;
  status: string;
  reversalNumber: string | null;
  sourceId: number;
  reversalOperation:
    | "reverse_school_fee_payment"
    | "reverse_feeding_receipt"
    | "reverse_admission_receipt"
    | "reverse_misc_receipt";
};

export async function getReceiptsPage(
  raw: Record<string, string | string[] | undefined>,
) {
  const firstValue = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const requestedDate = firstValue(raw.date);
  const status = firstValue(raw.status);
  const q = safeDirectorySearch(firstValue(raw.q) ?? "");
  const date =
    requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
      ? requestedDate
      : "";
  const statusFilter =
    status === "reversed" ? "reversed" : status === "active" ? "active" : "all";
  const requestedPage = Number(firstValue(raw.page));
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = 25;
  const offset = (page - 1) * pageSize;
  const supabase = await createServerSupabaseClient();
  let request = supabase
    .from("financial_activity_report")
    .select(
      "record_id,source,document_reference,person_name,category,amount,business_date,status,reversal_reference,created_at",
      { count: "exact" },
    )
    .eq("record_kind", "income");
  if (statusFilter !== "all") request = request.eq("status", statusFilter);
  if (date) request = request.eq("business_date", date);
  if (q) {
    const pattern = `%${q}%`;
    request = request.or(
      `document_reference.ilike.${pattern},person_name.ilike.${pattern},source.ilike.${pattern},category.ilike.${pattern}`,
    );
  }
  const result = await request
    .order("business_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);
  if (result.error)
    throw new Error(
      "Receipts could not be loaded. Try again or contact an administrator.",
    );
  const miscellaneousIds = result.data
    .filter((row) => row.source === "Miscellaneous")
    .map((row) => Number(row.record_id));
  const miscellaneous = miscellaneousIds.length
    ? await supabase
        .from("misc_receipts")
        .select("id,description")
        .in("id", miscellaneousIds)
    : { data: [], error: null };
  if (miscellaneous.error)
    throw new Error(
      "Receipts could not be loaded. Try again or contact an administrator.",
    );
  const descriptionById = new Map(
    miscellaneous.data.map((row) => [row.id, row.description]),
  );
  const rows: FinanceReceiptRow[] = result.data.map((row) => {
    const source =
      row.source === "School fees"
        ? "School fee"
        : row.source === "Feeding" ||
            row.source === "Admission" ||
            row.source === "Miscellaneous"
          ? row.source
          : "Miscellaneous";
    const description =
      source === "School fee"
        ? "School-fee payment"
        : source === "Feeding"
          ? row.person_name === "Daily aggregate"
            ? "Daily feeding total"
            : "Feeding collection"
          : source === "Admission"
            ? row.person_name === "Daily aggregate"
              ? "Daily admission total"
              : "Admission collection"
            : (descriptionById.get(Number(row.record_id)) ??
              row.category ??
              "Miscellaneous collection");
    const reversalOperation =
      source === "School fee"
        ? ("reverse_school_fee_payment" as const)
        : source === "Feeding"
          ? ("reverse_feeding_receipt" as const)
          : source === "Admission"
            ? ("reverse_admission_receipt" as const)
            : ("reverse_misc_receipt" as const);
    return {
      id: Number(row.record_id),
      receiptNumber: row.document_reference ?? "—",
      source,
      person: row.person_name ?? "Unattributed payer",
      description,
      amount: formatRateAmount(row.amount ?? 0),
      businessDate: row.business_date ?? "",
      status: row.status ?? "active",
      reversalNumber: row.reversal_reference,
      sourceId: Number(row.record_id),
      reversalOperation,
    };
  });
  return {
    rows,
    total: result.count ?? 0,
    page,
    pageSize,
    date,
    status: statusFilter,
    q,
  };
}

export async function getExpensesPage(
  raw: Record<string, string | string[] | undefined>,
) {
  const firstValue = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const requestedDate = firstValue(raw.date);
  const status = firstValue(raw.status);
  const q = safeDirectorySearch(firstValue(raw.q) ?? "");
  const date =
    requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
      ? requestedDate
      : "";
  const statusFilter =
    status === "reversed" ? "reversed" : status === "active" ? "active" : "all";
  const requestedPage = Number(firstValue(raw.page));
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = 25;
  const offset = (page - 1) * pageSize;
  const supabase = await createServerSupabaseClient();
  let request = supabase
    .from("expenses")
    .select(
      "id,expense_number,description,amount,business_date,status,reversal_number,expense_category_name_snapshot,payment_method_name_snapshot",
      { count: "exact" },
    )
    .order("business_date", { ascending: false })
    .order("id", { ascending: false });
  if (statusFilter !== "all") request = request.eq("status", statusFilter);
  if (date) request = request.eq("business_date", date);
  if (q) {
    const pattern = `%${q}%`;
    request = request.or(
      `expense_number.ilike.${pattern},description.ilike.${pattern},expense_category_name_snapshot.ilike.${pattern},payment_method_name_snapshot.ilike.${pattern}`,
    );
  }
  const result = await request.range(offset, offset + pageSize - 1);
  if (result.error)
    throw new Error(
      "Expenses could not be loaded. Try again or contact an administrator.",
    );
  return {
    rows: result.data.map((row) => ({
      id: row.id,
      expenseNumber: row.expense_number,
      description: row.description,
      category: row.expense_category_name_snapshot,
      paymentMethod: row.payment_method_name_snapshot,
      amount: formatRateAmount(row.amount),
      businessDate: row.business_date,
      status: row.status,
      reversalNumber: row.reversal_number,
    })),
    total: result.count ?? 0,
    page,
    pageSize,
    date,
    status: statusFilter,
    q,
  };
}

export async function getOutstandingInvoices(
  raw: OutstandingSearchParams,
  options: { mode?: "page" | "print" } = {},
) {
  const query = normalizeOutstandingQuery(raw);
  const isPrint = options.mode === "print";
  const pageSize = isPrint ? 1000 : 25;
  const page = isPrint ? 1 : query.page;
  const offset = (page - 1) * pageSize;
  const supabase = await createServerSupabaseClient();
  let request = supabase
    .from("invoices")
    .select(
      "id,student_id,invoice_number,student_name_snapshot,admission_number_snapshot,class_id,class_name_snapshot,location_name_snapshot,academic_year_name_snapshot,academic_term_id,academic_term_name_snapshot,total,amount_paid,outstanding,status,issued_on",
      { count: "exact" },
    )
    .in("status", ["unpaid", "partially_paid"])
    .gt("outstanding", 0);
  if (query.q)
    request = request.or(
      `student_name_snapshot.ilike.%${query.q}%,admission_number_snapshot.ilike.%${query.q}%,invoice_number.ilike.%${query.q}%`,
    );
  if (query.classId) request = request.eq("class_id", query.classId);
  if (query.academicTermId)
    request = request.eq("academic_term_id", query.academicTermId);

  const [result, classes, terms, years] = await Promise.all([
    request
      .order("outstanding", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + pageSize - 1),
    supabase
      .from("classes")
      .select("id,name,status")
      .order("sort_order")
      .order("id")
      .limit(100),
    supabase
      .from("academic_terms")
      .select("id,name,academic_year_id,is_current,status,sequence")
      .order("academic_year_id", { ascending: false })
      .order("sequence")
      .limit(150),
    supabase
      .from("academic_years")
      .select("id,name")
      .order("starts_on", { ascending: false })
      .limit(50),
  ]);
  if (result.error || classes.error || terms.error || years.error)
    throw new Error(
      "Outstanding balances could not be loaded. Try again or contact an administrator.",
    );

  const rows: OutstandingInvoiceRow[] = result.data.map((row) => ({
    id: row.id,
    studentId: row.student_id,
    invoiceNumber: row.invoice_number,
    studentName: row.student_name_snapshot,
    admissionNumber: row.admission_number_snapshot,
    className: row.class_name_snapshot,
    locationName: row.location_name_snapshot,
    academicYearName: row.academic_year_name_snapshot,
    academicTermName: row.academic_term_name_snapshot,
    total: formatRateAmount(row.total),
    amountPaid: formatRateAmount(row.amount_paid),
    outstanding: formatRateAmount(row.outstanding ?? 0),
    status: row.status as OutstandingInvoiceRow["status"],
    issuedOn: row.issued_on,
  }));

  return {
    rows,
    total: result.count ?? 0,
    page,
    pageSize,
    query,
    classes: classes.data.map((item) => ({
      id: item.id,
      label: `${item.name}${item.status === "active" ? "" : " (archived)"}`,
    })),
    terms: terms.data.map((term) => ({
      id: term.id,
      label: `${years.data.find((year) => year.id === term.academic_year_id)?.name ?? "Academic year"} · ${term.name}${term.is_current ? " · Current" : ""}`,
    })),
    truncated: isPrint && (result.count ?? 0) > pageSize,
  };
}

export async function getOutstandingReportIdentity() {
  const supabase = await createServerSupabaseClient();
  const result = await supabase
    .from("school_settings")
    .select("school_name,address,phone,email,motto,logo_path")
    .eq("id", 1)
    .single();
  if (result.error)
    throw new Error(
      "School identity could not be loaded for this report. Try again or contact an administrator.",
    );
  return {
    schoolName: result.data.school_name,
    schoolAddress: result.data.address,
    schoolPhone: result.data.phone,
    schoolEmail: result.data.email,
    schoolMotto: result.data.motto,
    schoolLogoPath: result.data.logo_path,
  };
}

export async function getStudentFinanceHistory(studentId: number) {
  const supabase = await createServerSupabaseClient();
  const [student, invoices] = await Promise.all([
    supabase
      .from("students")
      .select("id,first_name,middle_name,last_name,admission_number")
      .eq("id", studentId)
      .maybeSingle(),
    supabase
      .from("invoices")
      .select(
        "id,invoice_number,student_name_snapshot,class_name_snapshot,location_name_snapshot,total,amount_paid,outstanding,status,issued_on",
      )
      .eq("student_id", studentId)
      .order("issued_on", { ascending: false })
      .order("id", { ascending: false })
      .limit(100),
  ]);
  if (student.error || invoices.error)
    throw new Error(
      "Student financial history could not be loaded. Try again or contact an administrator.",
    );
  if (!student.data) return null;
  const invoiceIds = invoices.data.map((invoice) => invoice.id);
  const payments = invoiceIds.length
    ? await supabase
        .from("payments")
        .select("id,payment_number,invoice_id,amount,business_date,status")
        .in("invoice_id", invoiceIds)
        .order("business_date", { ascending: false })
        .limit(200)
    : { data: [], error: null };
  if (payments.error)
    throw new Error(
      "Student payment history could not be loaded. Try again or contact an administrator.",
    );
  return {
    student: {
      id: student.data.id,
      full_name: [
        student.data.first_name,
        student.data.middle_name,
        student.data.last_name,
      ]
        .filter(Boolean)
        .join(" "),
      admission_number: student.data.admission_number,
    },
    invoices: invoices.data.map((invoice) => ({
      ...invoice,
      total: formatRateAmount(invoice.total),
      amountPaid: formatRateAmount(invoice.amount_paid),
      outstanding: formatRateAmount(invoice.outstanding ?? 0),
    })),
    payments: payments.data.map((payment) => ({
      ...payment,
      amount: formatRateAmount(payment.amount),
    })),
  };
}

export async function getReceiptDocument(
  source: FinanceReceiptRow["source"],
  sourceId: number,
) {
  const supabase = await createServerSupabaseClient();
  if (source === "School fee") {
    const result = await supabase
      .from("receipts")
      .select(
        "receipt_number,student_name_snapshot,admission_number_snapshot,class_name_snapshot,academic_year_name_snapshot,academic_term_name_snapshot,invoice_number_snapshot,payment_method_name_snapshot,collected_by_snapshot,amount,previous_balance,remaining_balance,business_date,payment:payments(external_reference),status,reversal_number,reversal_reason,reversed_at,reversed_by_name_snapshot,school_name_snapshot,school_address_snapshot,school_phone_snapshot,school_email_snapshot,school_motto_snapshot,school_logo_path_snapshot,recorded_by_snapshot",
      )
      .eq("payment_id", sourceId)
      .maybeSingle();
    if (result.error) throw new Error("Receipt could not be loaded.");
    return result.data
      ? {
          source,
          ...result.data,
          amount: formatRateAmount(result.data.amount),
          previous_balance: formatRateAmount(result.data.previous_balance),
          remaining_balance: formatRateAmount(result.data.remaining_balance),
          external_reference: result.data.payment?.external_reference ?? null,
        }
      : null;
  }
  const table =
    source === "Feeding"
      ? "feeding_receipts"
      : source === "Admission"
        ? "admission_receipts"
        : "misc_receipts";
  const result = await supabase
    .from(table)
    .select("*")
    .eq("id", sourceId)
    .maybeSingle();
  if (result.error) throw new Error("Receipt could not be loaded.");
  if (!result.data) return null;
  return {
    source,
    ...result.data,
    amount: formatRateAmount(result.data.amount),
  };
}

export async function getExpenseDocument(expenseId: number) {
  const supabase = await createServerSupabaseClient();
  const result = await supabase
    .from("expenses")
    .select(
      "id,expense_number,amount,business_date,description,external_reference,attachment_path,status,reversal_number,reversal_reason,reversed_at,reversed_by_name_snapshot,expense_category_name_snapshot,payment_method_name_snapshot,school_name_snapshot,school_address_snapshot,school_phone_snapshot,school_email_snapshot,school_motto_snapshot,school_logo_path_snapshot,recorded_by_snapshot",
    )
    .eq("id", expenseId)
    .maybeSingle();
  if (result.error || !result.data) return null;
  return {
    ...result.data,
    categoryName: result.data.expense_category_name_snapshot,
    paymentMethodName: result.data.payment_method_name_snapshot,
  };
}

export async function getInvoiceDetail(
  invoiceId: number,
): Promise<InvoiceDetail | null> {
  const supabase = await createServerSupabaseClient();
  const invoice = await supabase
    .from("invoices")
    .select(
      `${invoiceListColumns},student_id,subtotal,cancelled_at,cancellation_number,cancellation_reason,cancelled_by_name_snapshot,created_at,school_name_snapshot,school_address_snapshot,school_phone_snapshot,school_email_snapshot,school_motto_snapshot,school_logo_path_snapshot,recorded_by_snapshot`,
    )
    .eq("id", invoiceId)
    .maybeSingle();
  if (invoice.error) throw new Error(invoiceError);
  if (!invoice.data) return null;
  const row = invoice.data as unknown as InvoiceRow & {
    student_id: number;
    subtotal: number;
    cancelled_at: string | null;
    cancellation_reason: string | null;
    created_at: string;
    cancellation_number: string | null;
    cancelled_by_name_snapshot: string | null;
    school_name_snapshot: string;
    school_address_snapshot: string | null;
    school_phone_snapshot: string | null;
    school_email_snapshot: string | null;
    school_motto_snapshot: string | null;
    school_logo_path_snapshot: string | null;
    recorded_by_snapshot: string;
  };
  const lines = await supabase
    .from("invoice_lines")
    .select("id,description,amount,sort_order")
    .eq("invoice_id", invoiceId)
    .order("sort_order");
  if (lines.error) throw new Error(invoiceError);
  const libraryBalance = await getInvoiceLibraryBalance(
    row.student_id,
    row.academic_term_id,
  );
  return {
    ...mapInvoiceRow(row),
    studentId: row.student_id,
    academicTermId: row.academic_term_id,
    subtotal: formatRateAmount(row.subtotal),
    schoolName: row.school_name_snapshot,
    schoolAddress: row.school_address_snapshot,
    schoolPhone: row.school_phone_snapshot,
    schoolEmail: row.school_email_snapshot,
    schoolMotto: row.school_motto_snapshot,
    schoolLogoPath: row.school_logo_path_snapshot,
    cancelledAt: row.cancelled_at,
    cancelledByName: row.cancelled_by_name_snapshot,
    cancellationNumber: row.cancellation_number,
    cancellationReason: row.cancellation_reason,
    createdByName: row.recorded_by_snapshot,
    createdAt: row.created_at,
    lines: lines.data.map((line) => ({
      id: line.id,
      description: line.description,
      amount: formatRateAmount(line.amount),
      sortOrder: line.sort_order,
    })),
    libraryBalance,
  };
}

const endTermInvoiceColumns = `${invoiceListColumns},student_id,subtotal,cancelled_at,cancellation_number,cancellation_reason,cancelled_by_name_snapshot,created_at,school_name_snapshot,school_address_snapshot,school_phone_snapshot,school_email_snapshot,school_motto_snapshot,school_logo_path_snapshot,recorded_by_snapshot,source_academic_term_id,previous_balance_snapshot,prospectus_amount_snapshot,parent_notes_snapshot,invoice_lines(id,description,amount,sort_order)`;

type EndTermInvoiceDatabaseRow = InvoiceRow & {
  student_id: number;
  subtotal: number;
  cancelled_at: string | null;
  cancellation_number: string | null;
  cancellation_reason: string | null;
  cancelled_by_name_snapshot: string | null;
  created_at: string;
  school_name_snapshot: string;
  school_address_snapshot: string | null;
  school_phone_snapshot: string | null;
  school_email_snapshot: string | null;
  school_motto_snapshot: string | null;
  school_logo_path_snapshot: string | null;
  recorded_by_snapshot: string;
  source_academic_term_id: number;
  previous_balance_snapshot: number;
  prospectus_amount_snapshot: number;
  parent_notes_snapshot: string | null;
  invoice_lines: Array<{
    id: number;
    description: string;
    amount: number;
    sort_order: number;
  }>;
};

function normalizeEndTermSetup(value: unknown): EndTermInvoiceSetup {
  const item = value && typeof value === "object" ? value : {};
  const read = (key: string) => (item as Record<string, unknown>)[key];
  const number = (key: string) => Number(read(key) ?? 0);
  const nullableNumber = (key: string) => {
    const valueAtKey = read(key);
    return valueAtKey === null || valueAtKey === undefined
      ? null
      : Number(valueAtKey);
  };
  const nullableString = (key: string) => {
    const valueAtKey = read(key);
    return typeof valueAtKey === "string" ? valueAtKey : null;
  };
  return {
    ready: read("ready") === true,
    reason: nullableString("reason"),
    sourceTermId: number("sourceTermId"),
    sourceTermName: nullableString("sourceTermName") ?? "Current term",
    sourceAcademicYearId: number("sourceAcademicYearId"),
    sourceAcademicYearName:
      nullableString("sourceAcademicYearName") ?? "Current academic year",
    targetTermId: nullableNumber("targetTermId"),
    targetTermName: nullableString("targetTermName"),
    targetAcademicYearId: nullableNumber("targetAcademicYearId"),
    targetAcademicYearName: nullableString("targetAcademicYearName"),
    configurationId: nullableNumber("configurationId"),
    parentNotes: nullableString("parentNotes") ?? "",
    studentCount: number("studentCount"),
    generatedCount: number("generatedCount"),
    remainingCount: number("remainingCount"),
    missingSchoolFeeCount: number("missingSchoolFeeCount"),
    missingProspectusCount: number("missingProspectusCount"),
    schoolFeeConfigurationStatus: "not_started",
    libraryConfigurationStatus: "not_started",
  };
}

function mapEndTermInvoice(
  row: EndTermInvoiceDatabaseRow,
  sourceTermName: string,
  sourceAcademicYearName: string,
): EndTermInvoiceDocument {
  const previousBalance = formatRateAmount(row.previous_balance_snapshot);
  const prospectusAmount = formatRateAmount(row.prospectus_amount_snapshot);
  return {
    ...mapInvoiceRow(row),
    studentId: row.student_id,
    academicTermId: row.academic_term_id,
    subtotal: formatRateAmount(row.subtotal),
    schoolName: row.school_name_snapshot,
    schoolAddress: row.school_address_snapshot,
    schoolPhone: row.school_phone_snapshot,
    schoolEmail: row.school_email_snapshot,
    schoolMotto: row.school_motto_snapshot,
    schoolLogoPath: row.school_logo_path_snapshot,
    cancelledAt: row.cancelled_at,
    cancelledByName: row.cancelled_by_name_snapshot,
    cancellationNumber: row.cancellation_number,
    cancellationReason: row.cancellation_reason,
    createdByName: row.recorded_by_snapshot,
    createdAt: row.created_at,
    lines: row.invoice_lines
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((line) => ({
        id: line.id,
        description: line.description,
        amount: formatRateAmount(line.amount),
        sortOrder: line.sort_order,
      })),
    libraryBalance: null,
    previousBalance,
    prospectusAmount,
    parentNotes: row.parent_notes_snapshot,
    totalToPlanFor: (
      row.total +
      row.previous_balance_snapshot +
      row.prospectus_amount_snapshot
    ).toFixed(2),
    sourceTermName,
    sourceAcademicYearName,
  };
}

export async function getEndTermInvoiceSetup() {
  const supabase = await createServerSupabaseClient();
  const result = await supabase.rpc("get_end_term_invoice_setup", {});
  if (result.error)
    throw new Error("End-of-term invoice setup could not be loaded.");
  const setup = normalizeEndTermSetup(result.data);
  if (!setup.targetTermId) return setup;
  const configurations = await supabase
    .from("term_rate_configurations")
    .select("domain,status")
    .eq("academic_term_id", setup.targetTermId)
    .in("domain", ["school_fees", "library_prospectus"])
    .limit(2);
  if (configurations.error)
    throw new Error("End-of-term rate approvals could not be loaded.");
  const statusFor = (domain: string): TermRateConfigurationStatus =>
    (configurations.data.find((item) => item.domain === domain)?.status as
      "draft" | "approved" | undefined) ?? "not_started";
  const schoolFeeConfigurationStatus = statusFor("school_fees");
  const libraryConfigurationStatus = statusFor("library_prospectus");
  if (
    schoolFeeConfigurationStatus !== "approved" ||
    libraryConfigurationStatus !== "approved"
  ) {
    const reason =
      schoolFeeConfigurationStatus !== "approved" &&
      libraryConfigurationStatus !== "approved"
        ? "Approve the next-term school fees and Books & Prospectus drafts before generation."
        : schoolFeeConfigurationStatus !== "approved"
          ? "Approve the next-term school-fee draft before generation."
          : "Approve the next-term Books & Prospectus draft before generation.";
    return {
      ...setup,
      ready: false,
      reason,
      schoolFeeConfigurationStatus,
      libraryConfigurationStatus,
    };
  }
  return {
    ...setup,
    schoolFeeConfigurationStatus,
    libraryConfigurationStatus,
  };
}

export async function getEndTermInvoicesPage(
  raw: Record<string, string | string[] | undefined>,
  options: { pageSize?: number } = {},
): Promise<EndTermInvoicePage> {
  const firstValue = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const query = endTermInvoiceQuerySchema.parse({
    q: firstValue(raw.q),
    classId: firstValue(raw.classId),
    page: firstValue(raw.page),
  });
  const pageSize = Math.min(Math.max(options.pageSize ?? 25, 1), 50);
  const offset = (query.page - 1) * pageSize;
  const supabase = await createServerSupabaseClient();
  const [setup, classesResult] = await Promise.all([
    getEndTermInvoiceSetup(),
    supabase
      .from("classes")
      .select("id,name")
      .eq("status", "active")
      .order("sort_order")
      .order("id"),
  ]);
  if (classesResult.error)
    throw new Error("End-of-term invoice classes could not be loaded.");
  if (!setup.configurationId) {
    return {
      rows: [],
      total: 0,
      page: query.page,
      pageSize,
      query,
      classes: classesResult.data,
      setup,
    };
  }

  let request = supabase
    .from("invoices")
    .select(endTermInvoiceColumns, { count: "exact" })
    .eq("invoice_kind", "end_of_term")
    .eq("end_term_configuration_id", setup.configurationId);
  if (query.classId) request = request.eq("class_id", query.classId);
  if (query.q) {
    const safePattern = safeDirectorySearch(query.q);
    if (safePattern)
      request = request.or(
        `invoice_number.ilike.%${safePattern}%,student_name_snapshot.ilike.%${safePattern}%,admission_number_snapshot.ilike.%${safePattern}%`,
      );
  }
  const result = await request
    .order("class_name_snapshot")
    .order("student_name_snapshot")
    .order("id")
    .range(offset, offset + pageSize - 1);
  if (result.error)
    throw new Error("End-of-term invoices could not be loaded.");
  const rows = result.data as unknown as EndTermInvoiceDatabaseRow[];
  return {
    rows: rows.map((row) =>
      mapEndTermInvoice(
        row,
        setup.sourceTermName,
        setup.sourceAcademicYearName,
      ),
    ),
    total: result.count ?? 0,
    page: query.page,
    pageSize,
    query,
    classes: classesResult.data,
    setup,
  };
}

export async function getEndTermInvoiceDetail(invoiceId: number) {
  const supabase = await createServerSupabaseClient();
  const invoice = await supabase
    .from("invoices")
    .select(endTermInvoiceColumns)
    .eq("id", invoiceId)
    .eq("invoice_kind", "end_of_term")
    .maybeSingle();
  if (invoice.error || !invoice.data) return null;
  const row = invoice.data as unknown as EndTermInvoiceDatabaseRow;
  const sourceTerm = await supabase
    .from("academic_terms")
    .select("name,academic_year_id")
    .eq("id", row.source_academic_term_id)
    .maybeSingle();
  if (sourceTerm.error || !sourceTerm.data) return null;
  const sourceYear = await supabase
    .from("academic_years")
    .select("name")
    .eq("id", sourceTerm.data.academic_year_id)
    .maybeSingle();
  if (sourceYear.error || !sourceYear.data) return null;
  return mapEndTermInvoice(row, sourceTerm.data.name, sourceYear.data.name);
}
