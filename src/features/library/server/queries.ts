import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  InvoiceLibraryBalance,
  LibraryChargeRow,
  LibraryClassOption,
  LibraryCollectionRow,
  LibraryPageResult,
  LibrarySummary,
  LibraryTermOption,
} from "../types";

const loadError =
  "Library balances could not be loaded. Try again or contact an administrator.";
const money = (value: number | null | undefined) =>
  Number(value ?? 0).toFixed(2);
const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

function summarize(
  rows: Array<{ expected_amount: number; amount_paid: number }>,
): LibrarySummary {
  const totals = rows.reduce(
    (sum, row) => ({
      expected: sum.expected + Math.round(row.expected_amount * 100),
      paid: sum.paid + Math.round(row.amount_paid * 100),
    }),
    { expected: 0, paid: 0 },
  );
  return {
    expected: (totals.expected / 100).toFixed(2),
    paid: (totals.paid / 100).toFixed(2),
    outstanding: ((totals.expected - totals.paid) / 100).toFixed(2),
    studentCount: rows.length,
  };
}

async function getOptions(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
) {
  const [years, terms, classes] = await Promise.all([
    supabase
      .from("academic_years")
      .select("id,name")
      .order("starts_on", { ascending: false })
      .limit(25),
    supabase
      .from("academic_terms")
      .select("id,academic_year_id,name,sequence,is_current,status")
      .eq("status", "active")
      .order("academic_year_id", { ascending: false })
      .order("sequence")
      .limit(100),
    supabase
      .from("classes")
      .select("id,code,name")
      .eq("status", "active")
      .order("sort_order")
      .limit(100),
  ]);
  if (years.error || terms.error || classes.error) throw new Error(loadError);
  const yearNames = new Map(years.data.map((year) => [year.id, year.name]));
  const termOptions: LibraryTermOption[] = terms.data.map((term) => ({
    id: term.id,
    academicYearId: term.academic_year_id,
    label: `${yearNames.get(term.academic_year_id) ?? "Academic year"} · ${term.name}`,
    isCurrent: term.is_current,
  }));
  const classOptions: LibraryClassOption[] = classes.data.map((item) => ({
    id: item.id,
    code: item.code,
    name: item.name,
  }));
  return { termOptions, classOptions };
}

export async function getLibraryPage(
  raw: Record<string, string | string[] | undefined>,
): Promise<LibraryPageResult> {
  const supabase = await createServerSupabaseClient();
  const { termOptions, classOptions } = await getOptions(supabase);
  const requestedTermId = Number(first(raw.termId));
  const selectedTermId = termOptions.some((term) => term.id === requestedTermId)
    ? requestedTermId
    : (termOptions.find((term) => term.isCurrent)?.id ??
      termOptions[0]?.id ??
      0);
  const requestedClassId = Number(first(raw.classId));
  const selectedClassId = classOptions.some(
    (item) => item.id === requestedClassId,
  )
    ? requestedClassId
    : null;
  const search = (first(raw.q) ?? "").trim().slice(0, 80);
  const requestedPage = Number(first(raw.page));
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = 25;
  const offset = (page - 1) * pageSize;

  const ratesRequest = supabase
    .from("library_term_rates")
    .select("id,class_id,charge_status,amount")
    .eq("academic_term_id", selectedTermId)
    .limit(100);
  let chargesRequest = supabase
    .from("library_charges")
    .select(
      "id,student_id,student_name_snapshot,admission_number_snapshot,class_id,class_name_snapshot,expected_amount,amount_paid,outstanding,status",
      { count: "exact" },
    )
    .eq("academic_term_id", selectedTermId);
  let summaryRequest = supabase
    .from("library_charges")
    .select("expected_amount,amount_paid")
    .eq("academic_term_id", selectedTermId)
    .limit(5000);
  if (selectedClassId) {
    chargesRequest = chargesRequest.eq("class_id", selectedClassId);
    summaryRequest = summaryRequest.eq("class_id", selectedClassId);
  }
  if (search) {
    const safe = search.replace(/[^\p{L}\p{N}\s/-]/gu, " ").trim();
    if (safe)
      chargesRequest = chargesRequest.or(
        `student_name_snapshot.ilike.%${safe}%,admission_number_snapshot.ilike.%${safe}%`,
      );
  }

  const [rates, charges, totals, methods, collections] = await Promise.all([
    ratesRequest,
    chargesRequest
      .order("class_name_snapshot")
      .order("student_name_snapshot")
      .order("id")
      .range(offset, offset + pageSize - 1),
    summaryRequest,
    supabase
      .from("payment_methods")
      .select("id,name,requires_reference")
      .eq("status", "active")
      .order("sort_order")
      .limit(50),
    supabase
      .from("library_collections")
      .select(
        "id,collection_number,student_name_snapshot,admission_number_snapshot,class_name_snapshot,amount,business_date,payment_method_name_snapshot,status,reversal_number",
      )
      .order("business_date", { ascending: false })
      .order("id", { ascending: false })
      .limit(25),
  ]);
  if (
    rates.error ||
    charges.error ||
    totals.error ||
    methods.error ||
    collections.error
  )
    throw new Error(loadError);

  const rateByClass = new Map(rates.data.map((rate) => [rate.class_id, rate]));
  const chargeRows: LibraryChargeRow[] = charges.data.map((row) => ({
    id: row.id,
    studentId: row.student_id,
    studentName: row.student_name_snapshot,
    admissionNumber: row.admission_number_snapshot,
    classId: row.class_id,
    className: row.class_name_snapshot,
    expected: money(row.expected_amount),
    paid: money(row.amount_paid),
    outstanding: money(row.outstanding),
    status: row.status as LibraryChargeRow["status"],
  }));
  const collectionRows: LibraryCollectionRow[] = collections.data.map(
    (row) => ({
      id: row.id,
      collectionNumber: row.collection_number,
      studentName: row.student_name_snapshot,
      admissionNumber: row.admission_number_snapshot,
      className: row.class_name_snapshot,
      amount: money(row.amount),
      businessDate: row.business_date,
      paymentMethod: row.payment_method_name_snapshot,
      status: row.status as LibraryCollectionRow["status"],
      reversalNumber: row.reversal_number,
    }),
  );

  return {
    terms: termOptions,
    classes: classOptions,
    rates: classOptions.map((item) => {
      const rate = rateByClass.get(item.id);
      return {
        classId: item.id,
        classCode: item.code,
        className: item.name,
        status: rate
          ? (rate.charge_status as "chargeable" | "not_charged")
          : "unconfigured",
        amount: rate?.amount == null ? null : money(rate.amount),
      };
    }),
    charges: chargeRows,
    collections: collectionRows,
    paymentMethods: methods.data.map((method) => ({
      id: method.id,
      name: method.name,
      requiresReference: method.requires_reference,
    })),
    summary: summarize(totals.data),
    selectedTermId,
    selectedClassId,
    search,
    page,
    pageSize,
    total: charges.count ?? 0,
  };
}

export async function getLibraryFinancialSummary(
  academicTermId: number,
): Promise<LibrarySummary> {
  const supabase = await createServerSupabaseClient();
  const result = await supabase
    .from("library_charges")
    .select("expected_amount,amount_paid")
    .eq("academic_term_id", academicTermId)
    .limit(5000);
  if (result.error) throw new Error(loadError);
  return summarize(result.data);
}

export async function getInvoiceLibraryBalance(
  studentId: number,
  academicTermId: number,
): Promise<InvoiceLibraryBalance | null> {
  const supabase = await createServerSupabaseClient();
  const result = await supabase
    .from("library_charges")
    .select("description,expected_amount,amount_paid,outstanding,status")
    .eq("student_id", studentId)
    .eq("academic_term_id", academicTermId)
    .maybeSingle();
  if (result.error) throw new Error(loadError);
  return result.data
    ? {
        description: result.data.description,
        expected: money(result.data.expected_amount),
        paid: money(result.data.amount_paid),
        outstanding: money(result.data.outstanding),
        status: result.data.status as InvoiceLibraryBalance["status"],
      }
    : null;
}
