import Link from "next/link";
import { Money } from "@/components/data-display/money";
import {
  StatusBadge,
  type StatusLabel,
} from "@/components/data-display/status-badge";
import {
  SalaryCashForm,
  SalaryCashReverseForm,
} from "@/features/finance/components/salary-forms";
import type {
  SalaryCashPosition,
  SalaryDetail,
  SalaryPaymentMethod,
} from "@/features/finance/types";

type WorkflowProps = {
  salary: SalaryDetail;
  canManage: boolean;
  businessDate: string;
  paymentMethods: SalaryPaymentMethod[];
};

function salaryStatus(position: SalaryCashPosition): StatusLabel {
  if (position.salaryPaymentStatus === "paid") return "Paid";
  if (position.salaryPaymentStatus === "partial") return "Partially Paid";
  if (position.salaryPaymentStatus === "reversed") return "Reversed";
  return "Unpaid";
}

function ssnitStatus(position: SalaryCashPosition): StatusLabel {
  if (position.ssnitStatus === "remitted") return "Remitted";
  if (position.ssnitStatus === "partial") return "Partially Remitted";
  if (position.ssnitStatus === "due") return "Due";
  if (position.ssnitStatus === "reversed") return "Reversed";
  return "Not Due";
}

function CashMetric({
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
        className={`mt-2 text-lg tabular-nums ${strong ? "font-bold text-primary" : "font-semibold"}`}
      >
        <Money value={value} />
      </dd>
    </div>
  );
}

function EmployeePaymentPanel({
  salary,
  canManage,
  businessDate,
  paymentMethods,
}: WorkflowProps) {
  const outstanding = salary.cashPosition.salaryOutstanding;
  return (
    <article className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Employee payment</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Record money actually paid to the employee against net salary.
          </p>
        </div>
        <StatusBadge status={salaryStatus(salary.cashPosition)} />
      </div>
      <dl className="mt-5 grid grid-cols-3 gap-4 border-y py-4">
        <CashMetric label="Net salary" value={salary.netSalary} />
        <CashMetric label="Paid" value={salary.cashPosition.salaryPaid} />
        <CashMetric label="Outstanding" value={outstanding} strong />
      </dl>
      {canManage && salary.status === "active" && outstanding !== "0.00" && (
        <SalaryCashForm
          kind="salary_payment"
          salaryRecordId={salary.id}
          outstanding={outstanding}
          businessDate={businessDate}
          paymentMethods={paymentMethods}
        />
      )}
      {outstanding === "0.00" && salary.status === "active" && (
        <p className="mt-5 text-sm font-medium text-success">
          Net salary has been fully paid.
        </p>
      )}
    </article>
  );
}

function SsnitRemittancePanel({
  salary,
  canManage,
  businessDate,
  paymentMethods,
}: WorkflowProps) {
  const outstanding = salary.cashPosition.ssnitOutstanding;
  return (
    <article className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">SSNIT remittance</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Record the employee contribution only when it is remitted to SSNIT.
          </p>
        </div>
        <StatusBadge status={ssnitStatus(salary.cashPosition)} />
      </div>
      <dl className="mt-5 grid grid-cols-3 gap-4 border-y py-4">
        <CashMetric label="SSNIT due" value={salary.cashPosition.ssnitDue} />
        <CashMetric
          label="Remitted"
          value={salary.cashPosition.ssnitRemitted}
        />
        <CashMetric label="Outstanding" value={outstanding} strong />
      </dl>
      {canManage && salary.status === "active" && outstanding !== "0.00" && (
        <SalaryCashForm
          kind="ssnit_remittance"
          salaryRecordId={salary.id}
          outstanding={outstanding}
          businessDate={businessDate}
          paymentMethods={paymentMethods}
        />
      )}
      {outstanding === "0.00" && salary.status === "active" && (
        <p className="mt-5 text-sm font-medium text-success">
          The SSNIT employee contribution has been fully remitted.
        </p>
      )}
    </article>
  );
}

function CashActivityTable({ salary, canManage }: WorkflowProps) {
  return (
    <section
      className="panel overflow-hidden"
      aria-labelledby="salary-cash-history-title"
    >
      <div className="border-b p-5">
        <h2 id="salary-cash-history-title" className="text-base font-semibold">
          Cash activity
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Active entries are outgoing expenses in financial reports. Reversed
          entries remain visible but no longer affect cash.
        </p>
      </div>
      {salary.cashEntries.length === 0 ? (
        <p className="p-5 text-sm text-muted-foreground">
          No salary payment or SSNIT remittance has been recorded.
        </p>
      ) : (
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Salary cash activity"
        >
          <table className="w-full min-w-210 text-sm">
            <thead className="bg-muted/70">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Entry</th>
                <th className="py-3 text-left font-medium">Type</th>
                <th className="py-3 text-left font-medium">Date</th>
                <th className="py-3 text-left font-medium">Method</th>
                <th className="py-3 text-right font-medium">Amount</th>
                <th className="py-3 text-left font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {salary.cashEntries.map((entry) => (
                <tr className="border-t" key={entry.id}>
                  <td className="px-5 py-4">
                    <Link
                      href={`/financials/expenses/document?id=${entry.id}`}
                      className="font-mono text-xs font-semibold text-primary hover:underline"
                    >
                      {entry.expenseNumber}
                    </Link>
                    {(entry.externalReference || entry.notes) && (
                      <p className="mt-1 max-w-64 text-xs text-muted-foreground">
                        {entry.externalReference ?? entry.notes}
                      </p>
                    )}
                  </td>
                  <td className="py-4">
                    {entry.kind === "salary_payment"
                      ? "Employee payment"
                      : "SSNIT remittance"}
                  </td>
                  <td className="py-4">{entry.businessDate}</td>
                  <td className="py-4">{entry.paymentMethod}</td>
                  <td className="py-4 text-right font-semibold">
                    <Money value={entry.amount} />
                  </td>
                  <td className="py-4">
                    <StatusBadge
                      status={entry.status === "active" ? "Active" : "Reversed"}
                    />
                    {entry.reversalNumber && (
                      <p className="mt-1 font-mono text-xs text-muted-foreground">
                        {entry.reversalNumber}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {canManage &&
                      salary.status === "active" &&
                      entry.status === "active" && (
                        <SalaryCashReverseForm
                          salaryRecordId={salary.id}
                          expenseId={entry.id}
                        />
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function SalaryCashWorkflow(props: WorkflowProps) {
  return (
    <>
      <section
        className="grid gap-5 xl:grid-cols-2"
        aria-label="Salary cash workflows"
      >
        <EmployeePaymentPanel {...props} />
        <SsnitRemittancePanel {...props} />
      </section>
      <CashActivityTable {...props} />
    </>
  );
}
