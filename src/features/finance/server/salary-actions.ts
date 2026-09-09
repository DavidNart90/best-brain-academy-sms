"use server";

import { revalidatePath } from "next/cache";
import { requireRateLimitedPermission } from "@/lib/security/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  deductionTypeInputSchema,
  salaryDeductionInputSchema,
  salaryRecordInputSchema,
  salaryReversalInputSchema,
} from "../schemas";
import type { FinanceActionResult } from "./actions";

const denied: FinanceActionResult = {
  ok: false,
  message: "Your account cannot process salary records.",
};

function message(error: { code?: string; message?: string } | null) {
  if (!error) return "The change could not be saved.";
  if (error.code === "23505")
    return error.message ?? "That record already exists.";
  if (
    error.code === "23503" ||
    error.code === "22023" ||
    error.code === "23514"
  )
    return error.message ?? "Review the salary values and try again.";
  if (error.code === "42501") return denied.message;
  return "The change could not be confirmed. Retry with the same values.";
}

function refreshSalary(id?: number, staffId?: number) {
  revalidatePath("/financials/salary-deductions");
  if (id) revalidatePath(`/financials/salary-deductions/${id}`);
  if (staffId) revalidatePath(`/staff/${staffId}`);
}

export async function saveDeductionType(
  input: unknown,
): Promise<FinanceActionResult> {
  const access = await requireRateLimitedPermission(
    "finance.settings.manage",
    "finance-settings",
  );
  if (!access.ok) return { ok: false, message: access.message };
  const context = access.context;
  const parsed = deductionTypeInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the deduction type.",
    };
  const supabase = await createServerSupabaseClient();
  const values = {
    code: parsed.data.code,
    name: parsed.data.name,
    calculation_type: parsed.data.calculationType,
    default_value: parsed.data.defaultValue
      ? Number(parsed.data.defaultValue)
      : null,
    auto_apply: parsed.data.autoApply,
    effective_from: parsed.data.effectiveFrom,
    effective_to: parsed.data.effectiveTo || null,
    notes: parsed.data.notes || null,
    sort_order: parsed.data.sortOrder,
    status: parsed.data.status,
    updated_by: context.id,
  };
  const result = parsed.data.id
    ? await supabase
        .from("salary_deduction_types")
        .update(values)
        .eq("id", parsed.data.id)
    : await supabase
        .from("salary_deduction_types")
        .insert({ ...values, created_by: context.id });
  if (result.error) return { ok: false, message: message(result.error) };
  revalidatePath("/settings/financials");
  revalidatePath("/financials/salary-deductions");
  return {
    ok: true,
    message: parsed.data.id
      ? "Deduction type updated."
      : "Deduction type added.",
  };
}

export async function recordSalary(
  input: unknown,
): Promise<FinanceActionResult> {
  const access = await requireRateLimitedPermission(
    "finance.transactions.manage",
    "finance-write",
  );
  if (!access.ok) return { ok: false, message: access.message };
  const parsed = salaryRecordInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the salary record.",
    };
  const supabase = await createServerSupabaseClient();
  const result = await supabase.rpc("record_salary_record", {
    request_key: parsed.data.requestKey,
    target_staff_id: parsed.data.staffId,
    target_payroll_month: parsed.data.payrollMonth,
    target_gross_salary: Number(parsed.data.grossSalary),
  });
  if (result.error) return { ok: false, message: message(result.error) };
  refreshSalary(undefined, parsed.data.staffId);
  return {
    ok: true,
    message: "Salary record posted with active automatic deductions.",
  };
}

export async function recordSalaryDeduction(
  input: unknown,
): Promise<FinanceActionResult> {
  const access = await requireRateLimitedPermission(
    "finance.transactions.manage",
    "finance-write",
  );
  if (!access.ok) return { ok: false, message: access.message };
  const parsed = salaryDeductionInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the deduction.",
    };
  const supabase = await createServerSupabaseClient();
  const result = await supabase.rpc("record_salary_deduction", {
    request_key: parsed.data.requestKey,
    target_salary_record_id: parsed.data.salaryRecordId,
    target_deduction_type_id: parsed.data.deductionTypeId,
    target_configured_value: Number(parsed.data.configuredValue),
    target_reason: parsed.data.reason || undefined,
  });
  if (result.error) return { ok: false, message: message(result.error) };
  refreshSalary(parsed.data.salaryRecordId);
  return { ok: true, message: "Deduction posted and net salary recalculated." };
}

export async function reverseSalary(
  kind: "salary" | "deduction",
  input: unknown,
): Promise<FinanceActionResult> {
  const access = await requireRateLimitedPermission(
    "finance.transactions.manage",
    "finance-write",
  );
  if (!access.ok) return { ok: false, message: access.message };
  const parsed = salaryReversalInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Enter a reversal reason.",
    };
  const supabase = await createServerSupabaseClient();
  const result =
    kind === "salary"
      ? await supabase.rpc("reverse_salary_record", {
          request_key: parsed.data.requestKey,
          target_salary_record_id: parsed.data.recordId,
          target_reason: parsed.data.reason,
        })
      : await supabase.rpc("reverse_salary_deduction", {
          request_key: parsed.data.requestKey,
          target_deduction_id: parsed.data.recordId,
          target_reason: parsed.data.reason,
        });
  if (result.error) return { ok: false, message: message(result.error) };
  const salaryId = (result.data as { salaryRecordId?: number } | null)
    ?.salaryRecordId;
  refreshSalary(kind === "salary" ? parsed.data.recordId : salaryId);
  return {
    ok: true,
    message:
      kind === "salary"
        ? "Salary record reversed."
        : "Deduction reversed and net salary recalculated.",
  };
}
