import "server-only";

import { getInvoiceLibraryBalance } from "@/features/library/server/queries";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { invoiceListQuerySchema } from "../schemas";
import type {
  BaseClassFeeRow,
  FinanceCategory,
  FinanceSettings,
  FlatFeeRow,
  InvoiceDetail,
  InvoiceListRow,
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

export async function getFinancePeriods() {
  const supabase = await createServerSupabaseClient();
  const [terms, years] = await Promise.all([
    supabase
      .from("academic_terms")
      .select("id,name,academic_year_id,is_current")
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
  const term = await (
    academicTermId
      ? termQuery.eq("id", academicTermId)
      : termQuery.eq("is_current", true)
  ).maybeSingle();
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
  ]);
  if (
    classes.error ||
    locations.error ||
    feeComponents.error ||
    rates.error ||
    methods.error ||
    expenseCategories.error ||
    miscCategories.error
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

  return {
    academicYearId: year.data.id,
    academicYearName: year.data.name,
    academicTermId: term.data.id,
    academicTermName: term.data.name,
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

export async function getCashflowFormOptions() {
  const supabase = await createServerSupabaseClient();
  const [methods, expenseCategories] = await Promise.all([
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
  ]);
  if (methods.error || expenseCategories.error)
    throw new Error(
      "Cashflow entry options could not be loaded. Try again or contact an administrator.",
    );
  return {
    paymentMethods: methods.data,
    expenseCategories: expenseCategories.data,
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
  const date =
    requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
      ? requestedDate
      : "";
  const statusFilter =
    status === "reversed" ? "reversed" : status === "active" ? "active" : "all";
  const supabase = await createServerSupabaseClient();
  const filter = <T extends { eq: (column: string, value: string) => T }>(
    query: T,
  ) => {
    const withStatus =
      statusFilter === "all" ? query : query.eq("status", statusFilter);
    return date ? withStatus.eq("business_date", date) : withStatus;
  };
  const [payments, feeding, admission, miscellaneous] = await Promise.all([
    filter(
      supabase
        .from("receipts")
        .select(
          "id,receipt_number,student_name_snapshot,amount,business_date,status,reversal_number,payment_id",
        )
        .order("business_date", { ascending: false })
        .limit(25),
    ),
    filter(
      supabase
        .from("feeding_receipts")
        .select(
          "id,receipt_number,student_name_snapshot,amount,business_date,status,reversal_number",
        )
        .order("business_date", { ascending: false })
        .limit(25),
    ),
    filter(
      supabase
        .from("admission_receipts")
        .select(
          "id,receipt_number,student_name_snapshot,amount,business_date,status,reversal_number",
        )
        .order("business_date", { ascending: false })
        .limit(25),
    ),
    filter(
      supabase
        .from("misc_receipts")
        .select(
          "id,receipt_number,payer_name,description,amount,business_date,status,reversal_number",
        )
        .order("business_date", { ascending: false })
        .limit(25),
    ),
  ]);
  if (payments.error || feeding.error || admission.error || miscellaneous.error)
    throw new Error(
      "Receipts could not be loaded. Try again or contact an administrator.",
    );
  const rows: FinanceReceiptRow[] = [
    ...payments.data.map((row) => ({
      id: row.id,
      receiptNumber: row.receipt_number,
      source: "School fee" as const,
      person: row.student_name_snapshot,
      description: "School-fee payment",
      amount: formatRateAmount(row.amount),
      businessDate: row.business_date,
      status: row.status,
      reversalNumber: row.reversal_number,
      sourceId: row.payment_id,
      reversalOperation: "reverse_school_fee_payment" as const,
    })),
    ...feeding.data.map((row) => ({
      id: row.id,
      receiptNumber: row.receipt_number,
      source: "Feeding" as const,
      person: row.student_name_snapshot ?? "Daily aggregate",
      description: row.student_name_snapshot
        ? "Feeding collection"
        : "Daily feeding total",
      amount: formatRateAmount(row.amount),
      businessDate: row.business_date,
      status: row.status,
      reversalNumber: row.reversal_number,
      sourceId: row.id,
      reversalOperation: "reverse_feeding_receipt" as const,
    })),
    ...admission.data.map((row) => ({
      id: row.id,
      receiptNumber: row.receipt_number,
      source: "Admission" as const,
      person: row.student_name_snapshot ?? "Daily aggregate",
      description: row.student_name_snapshot
        ? "Admission collection"
        : "Daily admission total",
      amount: formatRateAmount(row.amount),
      businessDate: row.business_date,
      status: row.status,
      reversalNumber: row.reversal_number,
      sourceId: row.id,
      reversalOperation: "reverse_admission_receipt" as const,
    })),
    ...miscellaneous.data.map((row) => ({
      id: row.id,
      receiptNumber: row.receipt_number,
      source: "Miscellaneous" as const,
      person: row.payer_name ?? "Unattributed payer",
      description: row.description,
      amount: formatRateAmount(row.amount),
      businessDate: row.business_date,
      status: row.status,
      reversalNumber: row.reversal_number,
      sourceId: row.id,
      reversalOperation: "reverse_misc_receipt" as const,
    })),
  ].sort((left, right) =>
    `${right.businessDate}-${right.id}`.localeCompare(
      `${left.businessDate}-${left.id}`,
    ),
  );
  return { rows: rows.slice(0, 50), date, status: statusFilter };
}

export async function getExpensesPage(
  raw: Record<string, string | string[] | undefined>,
) {
  const firstValue = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const requestedDate = firstValue(raw.date);
  const status = firstValue(raw.status);
  const date =
    requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
      ? requestedDate
      : "";
  const statusFilter =
    status === "reversed" ? "reversed" : status === "active" ? "active" : "all";
  const supabase = await createServerSupabaseClient();
  let request = supabase
    .from("expenses")
    .select(
      "id,expense_number,description,amount,business_date,status,reversal_number,expense_category_name_snapshot,payment_method_name_snapshot",
    )
    .order("business_date", { ascending: false })
    .order("id", { ascending: false })
    .limit(50);
  if (statusFilter !== "all") request = request.eq("status", statusFilter);
  if (date) request = request.eq("business_date", date);
  const result = await request;
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
    date,
    status: statusFilter,
  };
}

export async function getOutstandingInvoices(
  raw: Record<string, string | string[] | undefined>,
) {
  const firstValue = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const search = firstValue(raw.q)?.trim() ?? "";
  const supabase = await createServerSupabaseClient();
  let request = supabase
    .from("invoices")
    .select(
      "id,invoice_number,student_name_snapshot,admission_number_snapshot,class_name_snapshot,location_name_snapshot,total,amount_paid,outstanding,issued_on",
    )
    .in("status", ["unpaid", "partially_paid"])
    .gt("outstanding", 0)
    .order("outstanding", { ascending: false })
    .order("id", { ascending: false })
    .limit(100);
  if (search) {
    const safeSearch = search.replace(/[^\p{L}\p{N}\s/-]/gu, " ").trim();
    if (safeSearch)
      request = request.or(
        `student_name_snapshot.ilike.%${safeSearch}%,admission_number_snapshot.ilike.%${safeSearch}%,invoice_number.ilike.%${safeSearch}%`,
      );
  }
  const result = await request;
  if (result.error)
    throw new Error(
      "Outstanding balances could not be loaded. Try again or contact an administrator.",
    );
  return {
    search,
    rows: result.data.map((row) => ({
      id: row.id,
      invoiceNumber: row.invoice_number,
      studentName: row.student_name_snapshot,
      admissionNumber: row.admission_number_snapshot,
      className: row.class_name_snapshot,
      locationName: row.location_name_snapshot,
      total: formatRateAmount(row.total),
      amountPaid: formatRateAmount(row.amount_paid),
      outstanding: formatRateAmount(row.outstanding ?? 0),
      issuedOn: row.issued_on,
    })),
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
