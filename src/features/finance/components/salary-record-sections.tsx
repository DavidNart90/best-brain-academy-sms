import { Money } from "@/components/data-display/money";
import { StatusBadge } from "@/components/data-display/status-badge";
import {
  SalaryDeductionForm,
  SalaryReverseForm,
} from "@/features/finance/components/salary-forms";
import type { DeductionType, SalaryDetail } from "@/features/finance/types";

const timestampFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

function Metric({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={`mt-2 text-xl tabular-nums ${strong ? "font-bold text-primary" : "font-semibold"}`}
      >
        <Money value={value} />
      </dd>
    </div>
  );
}

export function SalaryPositionSummary({
  salary,
  canManage,
}: {
  salary: SalaryDetail;
  canManage: boolean;
}) {
  const hasActiveCash = salary.cashEntries.some(
    (entry) => entry.status === "active",
  );
  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-base font-semibold">Salary position</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {salary.staffNumber} · {salary.position}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge
            status={salary.status === "active" ? "Active" : "Reversed"}
          />
          {canManage && salary.status === "active" && !hasActiveCash && (
            <SalaryReverseForm kind="salary" recordId={salary.id} />
          )}
        </div>
      </div>
      <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Gross salary" value={salary.grossSalary} />
        <Metric label="Total deductions" value={salary.totalDeductions} />
        <Metric label="Net salary" value={salary.netSalary} strong />
        <div>
          <dt className="text-xs text-muted-foreground">Recorded by</dt>
          <dd className="mt-2 text-sm font-semibold">{salary.recordedBy}</dd>
          <dd className="mt-1 text-xs text-muted-foreground">
            {timestampFormatter.format(new Date(salary.createdAt))}
          </dd>
        </div>
      </dl>
      <p className="mt-5 rounded-md bg-muted p-3 text-sm text-muted-foreground">
        Posting this record calculated gross salary, payroll deductions and net
        salary. It did not mark the employee as paid or reduce cash.
      </p>
      {hasActiveCash && salary.status === "active" && (
        <p className="mt-3 text-xs text-muted-foreground">
          Reverse all active salary payments and SSNIT remittances before
          reversing this salary calculation.
        </p>
      )}
      {salary.status === "reversed" && (
        <div className="mt-5 rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm">
          <p className="font-semibold">Reversed {salary.reversalNumber}</p>
          <p className="mt-1 text-muted-foreground">
            {salary.reversalReason} ·{" "}
            {salary.reversedBy ?? "Authorized administrator"}
          </p>
        </div>
      )}
    </section>
  );
}

function DeductionsTable({
  salary,
  canManage,
  remittedDeductionIds,
}: {
  salary: SalaryDetail;
  canManage: boolean;
  remittedDeductionIds: Set<number>;
}) {
  if (salary.deductions.length === 0) {
    return (
      <p className="p-5 text-sm text-muted-foreground">
        No deductions are recorded.
      </p>
    );
  }
  return (
    <div
      className="table-scroll"
      tabIndex={0}
      role="region"
      aria-label="Payroll deductions"
    >
      <table className="w-full min-w-190 text-sm">
        <thead className="bg-muted/70">
          <tr>
            <th className="px-5 py-3 text-left font-medium">Deduction</th>
            <th className="py-3 text-left font-medium">Calculation</th>
            <th className="py-3 text-right font-medium">Amount</th>
            <th className="py-3 text-left font-medium">Status</th>
            <th className="px-5 py-3 text-right font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {salary.deductions.map((item) => {
            const hasRemittance = remittedDeductionIds.has(item.id);
            return (
              <tr className="border-t" key={item.id}>
                <td className="px-5 py-4">
                  <p className="font-semibold">{item.deductionTypeName}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {item.deductionNumber}
                  </p>
                  {item.reason && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.reason}
                    </p>
                  )}
                </td>
                <td className="py-4">
                  {item.calculationType === "percentage"
                    ? `${item.configuredValue}% of gross`
                    : "Fixed amount"}
                </td>
                <td className="py-4 text-right">
                  <Money value={item.amount} />
                </td>
                <td className="py-4">
                  <StatusBadge
                    status={item.status === "active" ? "Active" : "Reversed"}
                  />
                  {item.reversalNumber && (
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {item.reversalNumber}
                    </p>
                  )}
                </td>
                <td className="px-5 py-4 text-right">
                  {canManage &&
                    salary.status === "active" &&
                    item.status === "active" &&
                    !hasRemittance && (
                      <SalaryReverseForm kind="deduction" recordId={item.id} />
                    )}
                  {hasRemittance && (
                    <span className="text-xs text-muted-foreground">
                      Reverse remittance first
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function SalaryDeductionsSection({
  salary,
  canManage,
  deductionTypes,
}: {
  salary: SalaryDetail;
  canManage: boolean;
  deductionTypes: DeductionType[];
}) {
  const activeTypeIds = new Set<number>();
  for (const item of salary.deductions) {
    if (item.status === "active") activeTypeIds.add(item.deductionTypeId);
  }
  const remittedDeductionIds = new Set<number>();
  for (const entry of salary.cashEntries) {
    if (
      entry.status === "active" &&
      entry.kind === "ssnit_remittance" &&
      entry.salaryDeductionId !== null
    ) {
      remittedDeductionIds.add(entry.salaryDeductionId);
    }
  }
  const availableTypes = deductionTypes.filter(
    (item) => !activeTypeIds.has(item.id),
  );
  return (
    <>
      {canManage && salary.status === "active" && (
        <SalaryDeductionForm
          salaryRecordId={salary.id}
          deductionTypes={availableTypes}
        />
      )}
      <section
        className="panel overflow-hidden"
        aria-labelledby="deductions-title"
      >
        <div className="border-b p-5">
          <h2 id="deductions-title" className="text-base font-semibold">
            Deductions
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Each amount keeps the rule and gross salary used when it was posted.
          </p>
        </div>
        <DeductionsTable
          salary={salary}
          canManage={canManage}
          remittedDeductionIds={remittedDeductionIds}
        />
      </section>
    </>
  );
}
