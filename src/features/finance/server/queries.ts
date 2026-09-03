import "server-only";

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

export async function getFinanceSettings(): Promise<FinanceSettings> {
  const supabase = await createServerSupabaseClient();
  const [year, term] = await Promise.all([
    supabase
      .from("academic_years")
      .select("id,name")
      .eq("is_current", true)
      .maybeSingle(),
    supabase
      .from("academic_terms")
      .select("id,name,academic_year_id")
      .eq("is_current", true)
      .maybeSingle(),
  ]);
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
      .limit(200),
    supabase
      .from("payment_methods")
      .select("id,code,name,requires_reference,sort_order,status")
      .order("sort_order")
      .limit(50),
    supabase
      .from("expense_categories")
      .select("id,code,name,sort_order,status")
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
  "id,invoice_number,student_name_snapshot,admission_number_snapshot,class_name_snapshot,location_name_snapshot,total,amount_paid,outstanding,status,issued_on,academic_year_id,academic_term_id";
const invoiceError =
  "Invoices could not be loaded. Try again or contact an administrator.";

type InvoiceRow = {
  id: number;
  invoice_number: string;
  student_name_snapshot: string;
  admission_number_snapshot: string;
  class_name_snapshot: string;
  location_name_snapshot: string;
  total: number;
  amount_paid: number;
  outstanding: number;
  status: string;
  issued_on: string;
  academic_year_id: number;
  academic_term_id: number;
};

function mapInvoiceRow(
  row: InvoiceRow,
  yearNameById: Map<number, string>,
  termNameById: Map<number, string>,
): InvoiceListRow {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    studentName: row.student_name_snapshot,
    admissionNumber: row.admission_number_snapshot,
    className: row.class_name_snapshot,
    locationName: row.location_name_snapshot,
    academicYearName: yearNameById.get(row.academic_year_id) ?? "",
    academicTermName: termNameById.get(row.academic_term_id) ?? "",
    total: formatRateAmount(row.total),
    amountPaid: formatRateAmount(row.amount_paid),
    outstanding: formatRateAmount(row.outstanding),
    status: row.status as InvoiceListRow["status"],
    issuedOn: row.issued_on,
  };
}

async function periodNameMaps(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  yearIds: number[],
  termIds: number[],
) {
  const [years, terms] = await Promise.all([
    yearIds.length
      ? supabase.from("academic_years").select("id,name").in("id", yearIds)
      : Promise.resolve({ data: [], error: null }),
    termIds.length
      ? supabase.from("academic_terms").select("id,name").in("id", termIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (years.error || terms.error) throw new Error(invoiceError);
  return {
    yearNameById: new Map(years.data.map((row) => [row.id, row.name])),
    termNameById: new Map(terms.data.map((row) => [row.id, row.name])),
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
  const { yearNameById, termNameById } = await periodNameMaps(
    supabase,
    [...new Set(rows.map((row) => row.academic_year_id))],
    [...new Set(rows.map((row) => row.academic_term_id))],
  );
  return {
    rows: rows.map((row) => mapInvoiceRow(row, yearNameById, termNameById)),
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
  const [students, invoices, methods, expenseCategories, miscCategories] =
    await Promise.all([
      supabase
        .from("students")
        .select("id,admission_number,first_name,middle_name,last_name")
        .eq("status", "active")
        .order("last_name")
        .limit(200),
      supabase
        .from("invoices")
        .select("id,invoice_number,student_name_snapshot,outstanding")
        .in("status", ["unpaid", "partially_paid"])
        .order("issued_on", { ascending: false })
        .limit(200),
      supabase
        .from("payment_methods")
        .select("id,name,requires_reference,status")
        .eq("status", "active")
        .order("sort_order")
        .limit(50),
      supabase
        .from("expense_categories")
        .select("id,name,status")
        .eq("status", "active")
        .order("sort_order")
        .limit(100),
      supabase
        .from("misc_income_categories")
        .select("id,name,status")
        .eq("status", "active")
        .order("sort_order")
        .limit(100),
    ]);
  if (
    students.error ||
    invoices.error ||
    methods.error ||
    expenseCategories.error ||
    miscCategories.error
  )
    throw new Error(
      "Cashflow entry options could not be loaded. Try again or contact an administrator.",
    );
  return {
    students: students.data.map((student) => ({
      id: student.id,
      label: [student.first_name, student.middle_name, student.last_name]
        .filter(Boolean)
        .join(" "),
      admissionNumber: student.admission_number,
    })),
    invoices: invoices.data.map((invoice) => ({
      ...invoice,
      outstanding: invoice.outstanding ?? 0,
    })),
    paymentMethods: methods.data,
    expenseCategories: expenseCategories.data,
    miscIncomeCategories: miscCategories.data,
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
          "id,receipt_number,student_name_snapshot,amount,business_date,status,payment_id",
        )
        .order("business_date", { ascending: false })
        .limit(25),
    ),
    filter(
      supabase
        .from("feeding_receipts")
        .select(
          "id,receipt_number,student_name_snapshot,amount,business_date,status",
        )
        .order("business_date", { ascending: false })
        .limit(25),
    ),
    filter(
      supabase
        .from("admission_receipts")
        .select(
          "id,receipt_number,student_name_snapshot,amount,business_date,status",
        )
        .order("business_date", { ascending: false })
        .limit(25),
    ),
    filter(
      supabase
        .from("misc_receipts")
        .select(
          "id,receipt_number,payer_name,description,amount,business_date,status",
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
      sourceId: row.payment_id,
      reversalOperation: "reverse_school_fee_payment" as const,
    })),
    ...feeding.data.map((row) => ({
      id: row.id,
      receiptNumber: row.receipt_number,
      source: "Feeding" as const,
      person: row.student_name_snapshot,
      description: "Feeding collection",
      amount: formatRateAmount(row.amount),
      businessDate: row.business_date,
      status: row.status,
      sourceId: row.id,
      reversalOperation: "reverse_feeding_receipt" as const,
    })),
    ...admission.data.map((row) => ({
      id: row.id,
      receiptNumber: row.receipt_number,
      source: "Admission" as const,
      person: row.student_name_snapshot,
      description: "Admission collection",
      amount: formatRateAmount(row.amount),
      businessDate: row.business_date,
      status: row.status,
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
      "id,expense_number,description,amount,business_date,status,expense_category_id,payment_method_id",
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
  const categoryIds = [
    ...new Set(result.data.map((row) => row.expense_category_id)),
  ];
  const methodIds = [
    ...new Set(result.data.map((row) => row.payment_method_id)),
  ];
  const [categories, methods] = await Promise.all([
    categoryIds.length
      ? supabase
          .from("expense_categories")
          .select("id,name")
          .in("id", categoryIds)
      : Promise.resolve({ data: [], error: null }),
    methodIds.length
      ? supabase.from("payment_methods").select("id,name").in("id", methodIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (categories.error || methods.error)
    throw new Error(
      "Expense details could not be loaded. Try again or contact an administrator.",
    );
  const categoryNames = new Map(
    categories.data.map((row) => [row.id, row.name]),
  );
  const methodNames = new Map(methods.data.map((row) => [row.id, row.name]));
  return {
    rows: result.data.map((row) => ({
      id: row.id,
      expenseNumber: row.expense_number,
      description: row.description,
      category: categoryNames.get(row.expense_category_id) ?? "Uncategorised",
      paymentMethod: methodNames.get(row.payment_method_id) ?? "Unknown method",
      amount: formatRateAmount(row.amount),
      businessDate: row.business_date,
      status: row.status,
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
        "receipt_number,student_name_snapshot,admission_number_snapshot,class_name_snapshot,academic_year_name_snapshot,academic_term_name_snapshot,invoice_number_snapshot,payment_method_name_snapshot,collected_by_snapshot,amount,previous_balance,remaining_balance,business_date,status,reversal_reason,reversed_at",
      )
      .eq("payment_id", sourceId)
      .maybeSingle();
    if (result.error) throw new Error("Receipt could not be loaded.");
    return result.data ? { source, ...result.data } : null;
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
  if (source === "Miscellaneous") return { source, ...result.data };
  return {
    source,
    ...result.data,
    payment_method_name_snapshot: "Recorded payment method",
  };
}

export async function getExpenseDocument(expenseId: number) {
  const supabase = await createServerSupabaseClient();
  const result = await supabase
    .from("expenses")
    .select(
      "id,expense_number,expense_category_id,amount,business_date,description,payment_method_id,external_reference,attachment_path,status,reversal_reason,reversed_at",
    )
    .eq("id", expenseId)
    .maybeSingle();
  if (result.error || !result.data) return null;
  const [category, method] = await Promise.all([
    supabase
      .from("expense_categories")
      .select("name")
      .eq("id", result.data.expense_category_id)
      .maybeSingle(),
    supabase
      .from("payment_methods")
      .select("name")
      .eq("id", result.data.payment_method_id)
      .maybeSingle(),
  ]);
  if (category.error || method.error)
    throw new Error("Expense details could not be loaded.");
  return {
    ...result.data,
    categoryName: category.data?.name ?? "Uncategorised",
    paymentMethodName: method.data?.name ?? "Unknown method",
  };
}

export async function getInvoiceDetail(
  invoiceId: number,
): Promise<InvoiceDetail | null> {
  const supabase = await createServerSupabaseClient();
  const invoice = await supabase
    .from("invoices")
    .select(
      `${invoiceListColumns},student_id,subtotal,cancelled_at,cancellation_reason,created_by,updated_by,created_at,cancelled_by`,
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
    created_by: string;
    updated_by: string;
    created_at: string;
    cancelled_by: string | null;
  };
  const [lines, profiles] = await Promise.all([
    supabase
      .from("invoice_lines")
      .select("id,description,amount,sort_order")
      .eq("invoice_id", invoiceId)
      .order("sort_order"),
    supabase
      .from("profiles")
      .select("id,display_name")
      .in(
        "id",
        [row.created_by, row.cancelled_by].filter((id): id is string =>
          Boolean(id),
        ),
      ),
  ]);
  if (lines.error || profiles.error) throw new Error(invoiceError);
  const { yearNameById, termNameById } = await periodNameMaps(
    supabase,
    [row.academic_year_id],
    [row.academic_term_id],
  );
  const nameFor = (id: string | null) =>
    id
      ? (profiles.data.find((p) => p.id === id)?.display_name ??
        "Authorized administrator")
      : null;
  return {
    ...mapInvoiceRow(row, yearNameById, termNameById),
    studentId: row.student_id,
    subtotal: formatRateAmount(row.subtotal),
    cancelledAt: row.cancelled_at,
    cancelledByName: nameFor(row.cancelled_by),
    cancellationReason: row.cancellation_reason,
    createdByName: nameFor(row.created_by) ?? "Authorized administrator",
    createdAt: row.created_at,
    lines: lines.data.map((line) => ({
      id: line.id,
      description: line.description,
      amount: formatRateAmount(line.amount),
      sortOrder: line.sort_order,
    })),
  };
}
