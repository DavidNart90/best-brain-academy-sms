import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { salaryListQuerySchema } from "../schemas";
import type {
  DeductionType,
  SalaryDetail,
  SalaryListRow,
  SalaryStaffOption,
} from "../types";

const pageSize = 25;
const salaryLoadError = "Salary records could not be loaded.";
const money = (value: number) => value.toFixed(2);
const value = (amount: number | null) =>
  amount === null ? null : amount.toFixed(4).replace(/\.?0+$/, "");

export async function getDeductionTypes(): Promise<DeductionType[]> {
  const supabase = await createServerSupabaseClient();
  const result = await supabase
    .from("salary_deduction_types")
    .select(
      "id,code,name,calculation_type,default_value,auto_apply,effective_from,effective_to,notes,sort_order,status",
    )
    .order("sort_order")
    .limit(100);
  if (result.error) throw new Error(salaryLoadError);
  return result.data.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    calculationType: row.calculation_type as "percentage" | "fixed",
    defaultValue: value(row.default_value),
    autoApply: row.auto_apply,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    notes: row.notes,
    sortOrder: row.sort_order,
    status: row.status as "active" | "archived",
  }));
}

export async function getSalaryFormOptions(): Promise<{
  staff: SalaryStaffOption[];
  deductionTypes: DeductionType[];
}> {
  const supabase = await createServerSupabaseClient();
  const [staff, deductionTypes] = await Promise.all([
    supabase
      .from("staff_directory")
      .select("id,staff_number,full_name,position")
      .eq("status", "active")
      .order("full_name")
      .limit(250),
    getDeductionTypes(),
  ]);
  if (staff.error) throw new Error(salaryLoadError);
  return {
    staff: staff.data.flatMap((row) =>
      row.id && row.staff_number && row.full_name && row.position
        ? [
            {
              id: row.id,
              staffNumber: row.staff_number,
              name: row.full_name,
              position: row.position,
            },
          ]
        : [],
    ),
    deductionTypes,
  };
}

function mapSalary(row: {
  id: number;
  salary_number: string;
  staff_id: number;
  staff_number_snapshot: string;
  staff_name_snapshot: string;
  staff_position_snapshot: string;
  payroll_month: string;
  gross_salary: number;
  total_deductions: number;
  net_salary: number;
  status: string;
  reversal_number: string | null;
}): SalaryListRow {
  return {
    id: row.id,
    salaryNumber: row.salary_number,
    staffId: row.staff_id,
    staffNumber: row.staff_number_snapshot,
    staffName: row.staff_name_snapshot,
    position: row.staff_position_snapshot,
    payrollMonth: row.payroll_month,
    grossSalary: money(row.gross_salary),
    totalDeductions: money(row.total_deductions),
    netSalary: money(row.net_salary),
    status: row.status as "active" | "reversed",
    reversalNumber: row.reversal_number,
  };
}

export async function getSalaryPage(
  raw: Record<string, string | string[] | undefined>,
) {
  const currentMonth = `${new Date().toISOString().slice(0, 7)}-01`;
  const params = salaryListQuerySchema.parse({
    month: Array.isArray(raw.month) ? raw.month[0] : raw.month,
    q: Array.isArray(raw.q) ? raw.q[0] : raw.q,
    status: Array.isArray(raw.status) ? raw.status[0] : raw.status,
    page: Array.isArray(raw.page) ? raw.page[0] : raw.page,
  });
  const month = params.month || currentMonth;
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("salary_records")
    .select(
      "id,salary_number,staff_id,staff_number_snapshot,staff_name_snapshot,staff_position_snapshot,payroll_month,gross_salary,total_deductions,net_salary,status,reversal_number",
      { count: "exact" },
    )
    .eq("payroll_month", month)
    .order("staff_name_snapshot")
    .range((params.page - 1) * pageSize, params.page * pageSize - 1);
  if (params.status !== "all") query = query.eq("status", params.status);
  if (params.q)
    query = query.or(
      `staff_name_snapshot.ilike.%${params.q}%,staff_number_snapshot.ilike.%${params.q}%,salary_number.ilike.%${params.q}%`,
    );
  const [result, totals] = await Promise.all([
    query,
    supabase
      .from("salary_records")
      .select("gross_salary,total_deductions,net_salary")
      .eq("payroll_month", month)
      .eq("status", "active")
      .limit(500),
  ]);
  if (result.error || totals.error) throw new Error(salaryLoadError);
  const rows = result.data.map(mapSalary);
  return {
    rows,
    month,
    q: params.q,
    status: params.status,
    page: params.page,
    pageCount: Math.max(1, Math.ceil((result.count ?? 0) / pageSize)),
    grossSalary: money(
      totals.data.reduce((sum, row) => sum + row.gross_salary, 0),
    ),
    totalDeductions: money(
      totals.data.reduce((sum, row) => sum + row.total_deductions, 0),
    ),
    netSalary: money(totals.data.reduce((sum, row) => sum + row.net_salary, 0)),
    activeCount: totals.data.length,
  };
}

export async function getSalaryDetail(
  id: number,
): Promise<SalaryDetail | null> {
  const supabase = await createServerSupabaseClient();
  const [salary, deductions] = await Promise.all([
    supabase
      .from("salary_records")
      .select(
        "id,salary_number,staff_id,staff_number_snapshot,staff_name_snapshot,staff_position_snapshot,payroll_month,gross_salary,total_deductions,net_salary,status,reversal_number,reversal_reason,reversed_at,reversed_by_name_snapshot,recorded_by_snapshot,created_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("salary_deductions")
      .select(
        "id,deduction_number,deduction_type_id,deduction_type_name_snapshot,calculation_type_snapshot,configured_value_snapshot,gross_salary_snapshot,amount,reason,status,reversal_number,reversal_reason",
      )
      .eq("salary_record_id", id)
      .order("id")
      .limit(100),
  ]);
  if (salary.error || deductions.error) throw new Error(salaryLoadError);
  if (!salary.data) return null;
  return {
    ...mapSalary(salary.data),
    recordedBy: salary.data.recorded_by_snapshot,
    createdAt: salary.data.created_at,
    reversalReason: salary.data.reversal_reason,
    reversedAt: salary.data.reversed_at,
    reversedBy: salary.data.reversed_by_name_snapshot,
    deductions: deductions.data.map((row) => ({
      id: row.id,
      deductionNumber: row.deduction_number,
      deductionTypeId: row.deduction_type_id,
      deductionTypeName: row.deduction_type_name_snapshot,
      calculationType: row.calculation_type_snapshot as "percentage" | "fixed",
      configuredValue: value(row.configured_value_snapshot) ?? "0",
      grossSalary: money(row.gross_salary_snapshot),
      amount: money(row.amount),
      reason: row.reason,
      status: row.status as "active" | "reversed",
      reversalNumber: row.reversal_number,
      reversalReason: row.reversal_reason,
    })),
  };
}

export async function getStaffSalaryHistory(staffId: number) {
  const supabase = await createServerSupabaseClient();
  const result = await supabase
    .from("salary_records")
    .select(
      "id,salary_number,staff_id,staff_number_snapshot,staff_name_snapshot,staff_position_snapshot,payroll_month,gross_salary,total_deductions,net_salary,status,reversal_number",
    )
    .eq("staff_id", staffId)
    .order("payroll_month", { ascending: false })
    .limit(24);
  if (result.error) throw new Error(salaryLoadError);
  return result.data.map(mapSalary);
}
