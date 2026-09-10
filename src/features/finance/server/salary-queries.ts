import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { salaryListQuerySchema } from "../schemas";
import type {
  DeductionType,
  SalaryConfiguration,
  SalaryConfigurationStaffOption,
  SalaryCashPosition,
  SalaryDetail,
  SalaryListRow,
  SalaryPaymentMethod,
  SalaryStaffOption,
} from "../types";

const pageSize = 25;
const salaryLoadError = "Salary records could not be loaded.";
const money = (value: number) => value.toFixed(2);
const sumMoney = (values: number[]) =>
  (
    values.reduce((total, amount) => total + Math.round(amount * 100), 0) / 100
  ).toFixed(2);
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

export async function getSalaryFormOptions(
  payrollMonth: string,
): Promise<SalaryStaffOption[]> {
  const supabase = await createServerSupabaseClient();
  const [staff, configurations] = await Promise.all([
    supabase
      .from("staff_directory")
      .select("id,staff_number,full_name,position")
      .eq("status", "active")
      .order("full_name")
      .limit(250),
    supabase
      .from("staff_salary_configurations")
      .select("staff_id,gross_salary")
      .lte("effective_from", payrollMonth)
      .or(`effective_to.is.null,effective_to.gte.${payrollMonth}`)
      .limit(250),
  ]);
  if (staff.error || configurations.error) throw new Error(salaryLoadError);
  const configuredSalary = new Map(
    configurations.data.map((row) => [row.staff_id, row.gross_salary]),
  );
  return staff.data.flatMap((row) => {
    const grossSalary = row.id ? configuredSalary.get(row.id) : undefined;
    return row.id &&
      row.staff_number &&
      row.full_name &&
      row.position &&
      grossSalary !== undefined
      ? [
          {
            id: row.id,
            staffNumber: row.staff_number,
            name: row.full_name,
            position: row.position,
            grossSalary: money(grossSalary),
          },
        ]
      : [];
  });
}

export async function getSalaryConfigurations(): Promise<{
  rows: SalaryConfiguration[];
  availableStaff: SalaryConfigurationStaffOption[];
}> {
  const supabase = await createServerSupabaseClient();
  const [staff, configurations] = await Promise.all([
    supabase
      .from("staff_directory")
      .select("id,staff_number,full_name,position,status")
      .order("full_name")
      .limit(250),
    supabase
      .from("staff_salary_configurations")
      .select(
        "id,staff_id,gross_salary,effective_from,effective_to,status,notes,end_reason",
      )
      .order("effective_from", { ascending: false })
      .order("id", { ascending: false })
      .limit(250),
  ]);
  if (staff.error || configurations.error) throw new Error(salaryLoadError);
  const staffById = new Map(staff.data.map((row) => [row.id, row]));
  const rows = configurations.data.flatMap((row) => {
    const member = staffById.get(row.staff_id);
    return member?.id &&
      member.staff_number &&
      member.full_name &&
      member.position
      ? [
          {
            id: row.id,
            staffId: member.id,
            staffNumber: member.staff_number,
            staffName: member.full_name,
            position: member.position,
            grossSalary: money(row.gross_salary),
            effectiveFrom: row.effective_from,
            effectiveTo: row.effective_to,
            status: row.status as "active" | "ended",
            notes: row.notes,
            endReason: row.end_reason,
          },
        ]
      : [];
  });
  const activeStaffIds = new Set<number>();
  for (const row of rows) {
    if (row.status === "active") activeStaffIds.add(row.staffId);
  }
  return {
    rows,
    availableStaff: staff.data.flatMap((row) =>
      row.id &&
      row.staff_number &&
      row.full_name &&
      row.position &&
      row.status === "active" &&
      !activeStaffIds.has(row.id)
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

function mapCashPosition(row: {
  net_salary: number | null;
  salary_paid: number | null;
  salary_outstanding: number | null;
  salary_payment_status: string | null;
  ssnit_due: number | null;
  ssnit_remitted: number | null;
  ssnit_outstanding: number | null;
  ssnit_status: string | null;
}): SalaryCashPosition {
  return {
    netSalary: money(row.net_salary ?? 0),
    salaryPaid: money(row.salary_paid ?? 0),
    salaryOutstanding: money(row.salary_outstanding ?? 0),
    salaryPaymentStatus: (row.salary_payment_status ??
      "unpaid") as SalaryCashPosition["salaryPaymentStatus"],
    ssnitDue: money(row.ssnit_due ?? 0),
    ssnitRemitted: money(row.ssnit_remitted ?? 0),
    ssnitOutstanding: money(row.ssnit_outstanding ?? 0),
    ssnitStatus: (row.ssnit_status ??
      "not_due") as SalaryCashPosition["ssnitStatus"],
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
      .select("id,staff_id,gross_salary,total_deductions,net_salary")
      .eq("payroll_month", month)
      .eq("status", "active")
      .limit(500),
  ]);
  if (result.error || totals.error) throw new Error(salaryLoadError);
  const salaryIds = Array.from(
    new Set([...result.data, ...totals.data].map((row) => row.id)),
  );
  const positions = salaryIds.length
    ? await supabase
        .from("salary_cash_positions")
        .select(
          "salary_record_id,net_salary,salary_paid,salary_outstanding,salary_payment_status,ssnit_due,ssnit_remitted,ssnit_outstanding,ssnit_status",
        )
        .in("salary_record_id", salaryIds)
        .limit(500)
    : { data: [], error: null };
  if (positions.error) throw new Error(salaryLoadError);
  const positionById = new Map(
    positions.data.flatMap((row) =>
      row.salary_record_id
        ? [[row.salary_record_id, mapCashPosition(row)]]
        : [],
    ),
  );
  const rows = result.data.map((row) => ({
    ...mapSalary(row),
    cashPosition: positionById.get(row.id),
  }));
  const totalPositions = totals.data.flatMap((row) => {
    const position = positionById.get(row.id);
    return position ? [position] : [];
  });
  return {
    rows,
    month,
    q: params.q,
    status: params.status,
    page: params.page,
    pageCount: Math.max(1, Math.ceil((result.count ?? 0) / pageSize)),
    grossSalary: sumMoney(totals.data.map((row) => row.gross_salary)),
    totalDeductions: sumMoney(totals.data.map((row) => row.total_deductions)),
    netSalary: sumMoney(totals.data.map((row) => row.net_salary)),
    salaryPaid: sumMoney(totalPositions.map((row) => Number(row.salaryPaid))),
    salaryOutstanding: sumMoney(
      totalPositions.map((row) => Number(row.salaryOutstanding)),
    ),
    ssnitDue: sumMoney(totalPositions.map((row) => Number(row.ssnitDue))),
    ssnitRemitted: sumMoney(
      totalPositions.map((row) => Number(row.ssnitRemitted)),
    ),
    ssnitOutstanding: sumMoney(
      totalPositions.map((row) => Number(row.ssnitOutstanding)),
    ),
    activeCount: totals.data.length,
    activeStaffIds: totals.data.map((row) => row.staff_id),
    salaryOutstandingCount: totalPositions.filter(
      (row) => Number(row.salaryOutstanding) > 0,
    ).length,
  };
}

export async function getSalaryDetail(
  id: number,
): Promise<SalaryDetail | null> {
  const supabase = await createServerSupabaseClient();
  const [salary, deductions, cashPosition, cashEntries] = await Promise.all([
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
    supabase
      .from("salary_cash_positions")
      .select(
        "salary_record_id,net_salary,salary_paid,salary_outstanding,salary_payment_status,ssnit_due,ssnit_remitted,ssnit_outstanding,ssnit_status",
      )
      .eq("salary_record_id", id)
      .maybeSingle(),
    supabase
      .from("expenses")
      .select(
        "id,expense_number,payroll_cash_kind,amount,business_date,payment_method_name_snapshot,external_reference,notes,status,reversal_number,reversal_reason,salary_deduction_id",
      )
      .eq("salary_record_id", id)
      .not("payroll_cash_kind", "is", null)
      .order("business_date", { ascending: false })
      .order("id", { ascending: false })
      .limit(100),
  ]);
  if (
    salary.error ||
    deductions.error ||
    cashPosition.error ||
    cashEntries.error
  )
    throw new Error(salaryLoadError);
  if (!salary.data) return null;
  if (!cashPosition.data) throw new Error(salaryLoadError);
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
    cashPosition: mapCashPosition(cashPosition.data),
    cashEntries: cashEntries.data.flatMap((row) =>
      row.payroll_cash_kind === "salary_payment" ||
      row.payroll_cash_kind === "ssnit_remittance"
        ? [
            {
              id: row.id,
              expenseNumber: row.expense_number,
              kind: row.payroll_cash_kind,
              amount: money(row.amount),
              businessDate: row.business_date,
              paymentMethod: row.payment_method_name_snapshot,
              externalReference: row.external_reference,
              notes: row.notes,
              status: row.status as "active" | "reversed",
              reversalNumber: row.reversal_number,
              reversalReason: row.reversal_reason,
              salaryDeductionId: row.salary_deduction_id,
            },
          ]
        : [],
    ),
  };
}

export async function getSalaryPaymentMethods(): Promise<
  SalaryPaymentMethod[]
> {
  const supabase = await createServerSupabaseClient();
  const result = await supabase
    .from("payment_methods")
    .select("id,name,requires_reference")
    .eq("status", "active")
    .order("sort_order")
    .limit(50);
  if (result.error) throw new Error(salaryLoadError);
  return result.data.map((row) => ({
    id: row.id,
    name: row.name,
    requiresReference: row.requires_reference,
  }));
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
