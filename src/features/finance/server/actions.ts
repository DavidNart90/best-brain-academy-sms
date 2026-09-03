"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/access";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  baseClassFeesInputSchema,
  cancelInvoiceInputSchema,
  financeCategoryInputSchema,
  flatFeesInputSchema,
  generateInvoicesInputSchema,
  paymentMethodInputSchema,
  expenseInputSchema,
  miscReceiptInputSchema,
  reverseFinanceInputSchema,
  schoolFeePaymentInputSchema,
  studentReceiptInputSchema,
  transportChargesInputSchema,
} from "../schemas";
import type { GenerateInvoicesResult } from "../types";

export type FinanceActionResult = {
  ok: boolean;
  message: string;
};

const denied: FinanceActionResult = {
  ok: false,
  message: "Your account cannot change financial settings.",
};
const transactionsDenied: FinanceActionResult = {
  ok: false,
  message: "Your account cannot process financial transactions.",
};

function databaseMessage(error: { code?: string; message?: string } | null) {
  if (!error) return "The change could not be saved.";
  if (error.code === "23505")
    return "That code, display order or rate already exists for this period.";
  if (error.code === "23503")
    return "This record is linked to unavailable configuration.";
  if (error.code === "23514" || error.code === "22023")
    return error.message ?? "Review the values and try again.";
  if (error.code === "42501") return denied.message;
  return "The change could not be saved. Review the values and try again.";
}

function refreshFinanceSettings() {
  revalidatePath("/settings/financials");
}

function refreshInvoices(invoiceId?: number) {
  revalidatePath("/financials/invoices");
  if (invoiceId) revalidatePath(`/financials/invoices/${invoiceId}`);
}

async function canManageFinance() {
  return requirePermission("finance.settings.manage");
}

async function feeComponentId(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  code: string,
) {
  const result = await supabase
    .from("fee_components")
    .select("id")
    .eq("code", code)
    .single();
  if (result.error || !result.data)
    throw new Error("Fee component configuration is unavailable.");
  return result.data.id;
}

// Generated types map NUMERIC(14,2) columns to `number`; the validated decimal string
// (moneyAmountSchema) is only converted here, at the client boundary, never during validation.
function toRateAmount(amount: string) {
  return Number(amount);
}

export async function saveBaseClassFees(
  input: unknown,
): Promise<FinanceActionResult> {
  const context = await canManageFinance();
  if (!context) return denied;
  const parsed = baseClassFeesInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the class fees.",
    };
  const supabase = await createServerSupabaseClient();
  const componentId = await feeComponentId(supabase, "base_class_fee");
  for (const row of parsed.data.rows) {
    const result = row.rateId
      ? await supabase
          .from("fee_component_rates")
          .update({ amount: toRateAmount(row.amount), updated_by: context.id })
          .eq("id", row.rateId)
      : await supabase.from("fee_component_rates").insert({
          fee_component_id: componentId,
          academic_year_id: parsed.data.academicYearId,
          academic_term_id: parsed.data.academicTermId,
          class_id: row.classId,
          amount: toRateAmount(row.amount),
          created_by: context.id,
          updated_by: context.id,
        });
    if (result.error)
      return { ok: false, message: databaseMessage(result.error) };
  }
  refreshFinanceSettings();
  return { ok: true, message: "Base class fees saved." };
}

export async function saveTransportCharges(
  input: unknown,
): Promise<FinanceActionResult> {
  const context = await canManageFinance();
  if (!context) return denied;
  const parsed = transportChargesInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ?? "Check the transport charges.",
    };
  const supabase = await createServerSupabaseClient();
  const componentId = await feeComponentId(
    supabase,
    "location_transport_charge",
  );
  for (const row of parsed.data.rows) {
    const result = row.rateId
      ? await supabase
          .from("fee_component_rates")
          .update({ amount: toRateAmount(row.amount), updated_by: context.id })
          .eq("id", row.rateId)
      : await supabase.from("fee_component_rates").insert({
          fee_component_id: componentId,
          academic_year_id: parsed.data.academicYearId,
          academic_term_id: parsed.data.academicTermId,
          school_location_id: row.schoolLocationId,
          amount: toRateAmount(row.amount),
          created_by: context.id,
          updated_by: context.id,
        });
    if (result.error)
      return { ok: false, message: databaseMessage(result.error) };
  }
  refreshFinanceSettings();
  return { ok: true, message: "Transport charges saved." };
}

export async function saveFlatFees(
  input: unknown,
): Promise<FinanceActionResult> {
  const context = await canManageFinance();
  if (!context) return denied;
  const parsed = flatFeesInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the fee amounts.",
    };
  const supabase = await createServerSupabaseClient();
  const entries: Array<{
    code: string;
    rateId: number | null;
    amount: string;
  }> = [
    {
      code: "feeding_fee",
      rateId: parsed.data.feedingRateId,
      amount: parsed.data.feedingAmount,
    },
    {
      code: "admission_fee",
      rateId: parsed.data.admissionRateId,
      amount: parsed.data.admissionAmount,
    },
  ];
  for (const entry of entries) {
    const result = entry.rateId
      ? await supabase
          .from("fee_component_rates")
          .update({
            amount: toRateAmount(entry.amount),
            updated_by: context.id,
          })
          .eq("id", entry.rateId)
      : await supabase.from("fee_component_rates").insert({
          fee_component_id: await feeComponentId(supabase, entry.code),
          academic_year_id: parsed.data.academicYearId,
          academic_term_id: parsed.data.academicTermId,
          amount: toRateAmount(entry.amount),
          created_by: context.id,
          updated_by: context.id,
        });
    if (result.error)
      return { ok: false, message: databaseMessage(result.error) };
  }
  refreshFinanceSettings();
  return { ok: true, message: "Feeding and admission fees saved." };
}

export async function savePaymentMethod(
  input: unknown,
): Promise<FinanceActionResult> {
  const context = await canManageFinance();
  if (!context) return denied;
  const parsed = paymentMethodInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the payment method.",
    };
  const supabase = await createServerSupabaseClient();
  const values = {
    code: parsed.data.code,
    name: parsed.data.name,
    requires_reference: parsed.data.requiresReference,
    sort_order: parsed.data.sortOrder,
    status: parsed.data.status,
    updated_by: context.id,
  };
  const result = parsed.data.id
    ? await supabase
        .from("payment_methods")
        .update(values)
        .eq("id", parsed.data.id)
    : await supabase
        .from("payment_methods")
        .insert({ ...values, created_by: context.id });
  if (result.error)
    return { ok: false, message: databaseMessage(result.error) };
  refreshFinanceSettings();
  return {
    ok: true,
    message: parsed.data.id
      ? "Payment method updated."
      : "Payment method added.",
  };
}

async function saveFinanceCategory(
  table: "expense_categories" | "misc_income_categories",
  input: unknown,
): Promise<FinanceActionResult> {
  const context = await canManageFinance();
  if (!context) return denied;
  const parsed = financeCategoryInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the category.",
    };
  const supabase = await createServerSupabaseClient();
  const values = {
    code: parsed.data.code,
    name: parsed.data.name,
    sort_order: parsed.data.sortOrder,
    status: parsed.data.status,
    updated_by: context.id,
  };
  const result = parsed.data.id
    ? await supabase.from(table).update(values).eq("id", parsed.data.id)
    : await supabase.from(table).insert({ ...values, created_by: context.id });
  if (result.error)
    return { ok: false, message: databaseMessage(result.error) };
  refreshFinanceSettings();
  return {
    ok: true,
    message: parsed.data.id ? "Category updated." : "Category added.",
  };
}

export async function saveExpenseCategory(
  input: unknown,
): Promise<FinanceActionResult> {
  return saveFinanceCategory("expense_categories", input);
}

export async function saveMiscIncomeCategory(
  input: unknown,
): Promise<FinanceActionResult> {
  return saveFinanceCategory("misc_income_categories", input);
}

export type GenerateInvoicesActionResult = FinanceActionResult & {
  result?: GenerateInvoicesResult;
};

export async function generateTermInvoices(
  input: unknown,
): Promise<GenerateInvoicesActionResult> {
  const context = await requirePermission("finance.transactions.manage");
  if (!context) return transactionsDenied;
  const parsed = generateInvoicesInputSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: "Check the student selection." };
  const supabase = await createServerSupabaseClient();
  const [year, term] = await Promise.all([
    supabase
      .from("academic_years")
      .select("id")
      .eq("is_current", true)
      .maybeSingle(),
    supabase
      .from("academic_terms")
      .select("id")
      .eq("is_current", true)
      .maybeSingle(),
  ]);
  if (year.error || term.error || !year.data || !term.data)
    return {
      ok: false,
      message: "No current academic year/term is configured.",
    };
  const rpcResult = await supabase.rpc("generate_term_invoices", {
    target_academic_year_id: year.data.id,
    target_academic_term_id: term.data.id,
    target_student_id: parsed.data.studentId ?? undefined,
  });
  if (rpcResult.error)
    return { ok: false, message: databaseMessage(rpcResult.error) };
  const result = rpcResult.data as unknown as GenerateInvoicesResult;
  refreshInvoices();
  const skippedCount = result.skipped?.length ?? 0;
  return {
    ok: true,
    message: `${result.createdCount} invoice${result.createdCount === 1 ? "" : "s"} created${skippedCount ? `, ${skippedCount} skipped` : ""}.`,
    result,
  };
}

export async function cancelInvoiceAction(
  input: unknown,
): Promise<FinanceActionResult> {
  const context = await requirePermission("finance.transactions.manage");
  if (!context) return transactionsDenied;
  const parsed = cancelInvoiceInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ?? "A cancellation reason is required.",
    };
  const supabase = await createServerSupabaseClient();
  const rpcResult = await supabase.rpc("cancel_invoice", {
    target_invoice_id: parsed.data.invoiceId,
    target_reason: parsed.data.reason,
  });
  if (rpcResult.error)
    return { ok: false, message: databaseMessage(rpcResult.error) };
  refreshInvoices(parsed.data.invoiceId);
  return { ok: true, message: "Invoice cancelled." };
}

type ReversalOperation =
  | "reverse_school_fee_payment"
  | "reverse_feeding_receipt"
  | "reverse_admission_receipt"
  | "reverse_misc_receipt"
  | "void_expense";

export async function reverseFinanceAction(
  operation: ReversalOperation,
  input: unknown,
): Promise<FinanceActionResult> {
  const context = await requirePermission("finance.transactions.manage");
  if (!context) return transactionsDenied;
  const parsed = reverseFinanceInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the reversal details.",
    };

  const supabase = await createServerSupabaseClient();
  const rpc = {
    reverse_school_fee_payment: "reverse_school_fee_payment",
    reverse_feeding_receipt: "reverse_feeding_receipt",
    reverse_admission_receipt: "reverse_admission_receipt",
    reverse_misc_receipt: "reverse_misc_receipt",
    void_expense: "void_expense",
  } as const;
  const rpcName = rpc[operation];
  const rpcResult = await supabase.rpc(rpcName, {
    request_key: parsed.data.requestKey,
    request_fingerprint: parsed.data.requestFingerprint,
    target_receipt_id: parsed.data.recordId,
    target_payment_id: parsed.data.recordId,
    target_expense_id: parsed.data.recordId,
    target_reason: parsed.data.reason,
  });
  if (rpcResult.error)
    return { ok: false, message: databaseMessage(rpcResult.error) };

  revalidatePath("/financials");
  revalidatePath("/financials/payments");
  revalidatePath("/financials/receipts");
  revalidatePath("/financials/expenses");
  revalidatePath("/financials/outstanding");
  return {
    ok: true,
    message:
      operation === "void_expense"
        ? "Expense voided."
        : "Transaction reversed.",
  };
}

type PostingOperation =
  | "school_fee_payment"
  | "feeding_receipt"
  | "admission_receipt"
  | "misc_receipt"
  | "expense";

export async function recordFinanceAction(
  operation: PostingOperation,
  input: unknown,
): Promise<FinanceActionResult> {
  const context = await requirePermission("finance.transactions.manage");
  if (!context) return transactionsDenied;
  const parsed =
    operation === "school_fee_payment"
      ? schoolFeePaymentInputSchema.safeParse(input)
      : operation === "misc_receipt"
        ? miscReceiptInputSchema.safeParse(input)
        : operation === "expense"
          ? expenseInputSchema.safeParse(input)
          : studentReceiptInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ?? "Check the transaction details.",
    };

  const supabase = await createServerSupabaseClient();
  if (operation === "school_fee_payment") {
    const value = parsed.data as import("../schemas").SchoolFeePaymentInput;
    const result = await supabase.rpc("record_school_fee_payment", {
      request_key: value.requestKey,
      request_fingerprint: value.requestFingerprint,
      target_invoice_id: value.invoiceId,
      payment_amount: Number(value.amount),
      target_payment_method_id: value.paymentMethodId,
      target_business_date: value.businessDate,
      target_external_reference: value.externalReference || undefined,
      target_notes: value.notes || undefined,
    });
    if (result.error)
      return { ok: false, message: databaseMessage(result.error) };
  } else if (
    operation === "feeding_receipt" ||
    operation === "admission_receipt"
  ) {
    const value = parsed.data as import("../schemas").StudentReceiptInput;
    const result = await supabase.rpc(
      operation === "feeding_receipt"
        ? "record_feeding_receipt"
        : "record_admission_receipt",
      {
        request_key: value.requestKey,
        request_fingerprint: value.requestFingerprint,
        target_student_id: value.studentId,
        receipt_amount: Number(value.amount),
        target_business_date: value.businessDate,
        target_payment_method_id: value.paymentMethodId,
        target_external_reference: value.externalReference || undefined,
        target_notes: value.notes || undefined,
      },
    );
    if (result.error)
      return { ok: false, message: databaseMessage(result.error) };
  } else if (operation === "misc_receipt") {
    const value = parsed.data as import("../schemas").MiscReceiptInput;
    const result = await supabase.rpc("record_misc_receipt", {
      request_key: value.requestKey,
      request_fingerprint: value.requestFingerprint,
      target_misc_income_category_id: value.categoryId,
      target_description: value.description,
      receipt_amount: Number(value.amount),
      target_business_date: value.businessDate,
      target_payment_method_id: value.paymentMethodId,
      target_student_id: value.studentId ?? undefined,
      target_payer_name: value.payerName || undefined,
      target_external_reference: value.externalReference || undefined,
      target_notes: value.notes || undefined,
    });
    if (result.error)
      return { ok: false, message: databaseMessage(result.error) };
  } else {
    const value = parsed.data as import("../schemas").ExpenseInput;
    const result = await supabase.rpc("record_expense", {
      request_key: value.requestKey,
      request_fingerprint: value.requestFingerprint,
      target_expense_category_id: value.categoryId,
      expense_amount: Number(value.amount),
      target_business_date: value.businessDate,
      target_description: value.description,
      target_payment_method_id: value.paymentMethodId,
      target_external_reference: value.externalReference || undefined,
      target_attachment_path: value.attachmentPath || undefined,
      target_notes: value.notes || undefined,
    });
    if (result.error)
      return { ok: false, message: databaseMessage(result.error) };
  }

  revalidatePath("/financials/cashflow");
  revalidatePath("/financials/invoices");
  return { ok: true, message: "Transaction posted successfully." };
}
