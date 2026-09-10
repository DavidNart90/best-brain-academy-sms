import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Settings2,
} from "lucide-react";
import { Money } from "@/components/data-display/money";
import {
  PageState,
  PermissionDenied,
} from "@/components/data-display/page-state";
import { StatusBadge } from "@/components/data-display/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { SalaryBulkActions } from "@/features/finance/components/salary-bulk-actions";
import { SalaryEntryForm } from "@/features/finance/components/salary-forms";
import {
  getSalaryFormOptions,
  getSalaryPage,
  getSalaryPaymentMethods,
} from "@/features/finance/server/salary-queries";
import { requirePermission } from "@/lib/auth/access";
import { hasPermission } from "@/lib/permissions/contracts";

const monthFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const monthName = (value: string) =>
  monthFormatter.format(new Date(`${value}T00:00:00Z`));

export default async function SalaryDeductionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requirePermission("financials.read");
  if (!context) return <PermissionDenied />;
  const result = await getSalaryPage(await searchParams);
  const canManageSalary = hasPermission(context, "finance.transactions.manage");
  const [salaryStaff, paymentMethods] = canManageSalary
    ? await Promise.all([
        getSalaryFormOptions(result.month),
        getSalaryPaymentMethods(),
      ])
    : [null, null];
  const postedStaffIds = new Set(result.activeStaffIds);
  const postEligibleStaff =
    salaryStaff?.filter((staff) => !postedStaffIds.has(staff.id)) ?? [];
  const postGrossTotal = (
    postEligibleStaff.reduce(
      (total, staff) => total + Math.round(Number(staff.grossSalary) * 100),
      0,
    ) / 100
  ).toFixed(2);
  const search = new URLSearchParams({
    month: result.month,
    q: result.q,
    status: result.status,
  });

  return (
    <>
      <PageHeader
        title="Salaries & deductions"
        description="Monthly salary calculations, employee payment status and SSNIT remittance status. Posting a salary does not mark it paid."
      >
        <Button asChild variant="outline">
          <Link href="/settings/financials#staff-salaries">
            <Settings2 />
            Salary settings
          </Link>
        </Button>
      </PageHeader>
      <div className="space-y-5">
        {salaryStaff && paymentMethods && (
          <SalaryBulkActions
            payrollMonth={result.month}
            configuredCount={salaryStaff.length}
            postEligibleCount={postEligibleStaff.length}
            postGrossTotal={postGrossTotal}
            activeSalaryCount={result.activeCount}
            dispatchEligibleCount={result.salaryOutstandingCount}
            dispatchOutstandingTotal={result.salaryOutstanding}
            paymentMethods={paymentMethods}
          />
        )}
        {salaryStaff && (
          <SalaryEntryForm staff={salaryStaff} payrollMonth={result.month} />
        )}
        <section className="panel p-5" aria-labelledby="salary-period-title">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Salary period
              </p>
              <h2
                id="salary-period-title"
                className="mt-1 text-lg font-semibold"
              >
                {monthName(result.month)}
              </h2>
            </div>
            <form method="get" className="flex flex-wrap items-end gap-2">
              <div className="field">
                <label
                  htmlFor="salary-filter-month"
                  className="text-sm font-medium"
                >
                  Month
                </label>
                <input
                  id="salary-filter-month"
                  name="month"
                  type="month"
                  defaultValue={result.month.slice(0, 7)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
              <div className="field">
                <label
                  htmlFor="salary-filter-search"
                  className="text-sm font-medium"
                >
                  Staff or reference
                </label>
                <input
                  id="salary-filter-search"
                  name="q"
                  defaultValue={result.q}
                  maxLength={80}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>
              <div className="field">
                <label
                  htmlFor="salary-filter-status"
                  className="text-sm font-medium"
                >
                  Record status
                </label>
                <select
                  id="salary-filter-status"
                  name="status"
                  defaultValue={result.status}
                  className="native-select"
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="reversed">Reversed</option>
                </select>
              </div>
              <Button type="submit" variant="outline">
                <CalendarDays />
                Apply
              </Button>
            </form>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3 border-t pt-4 text-sm">
            <InlineAmount
              label="Payroll deductions"
              value={result.totalDeductions}
            />
            <InlineAmount label="SSNIT due" value={result.ssnitDue} />
            <InlineAmount label="SSNIT remitted" value={result.ssnitRemitted} />
            <InlineAmount
              label="SSNIT outstanding"
              value={result.ssnitOutstanding}
            />
            <span className="text-muted-foreground">
              Active records{" "}
              <strong className="font-semibold text-foreground">
                {result.activeCount}
              </strong>
            </span>
          </div>
        </section>
        <section
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Monthly salary totals"
        >
          <Summary label="Gross salary" value={result.grossSalary} />
          <Summary label="Net salary due" value={result.netSalary} />
          <Summary label="Salary paid" value={result.salaryPaid} />
          <Summary
            label="Salary outstanding"
            value={result.salaryOutstanding}
            primary
          />
        </section>
        {result.rows.length === 0 ? (
          <PageState
            kind="empty"
            title="No salary records for this month"
            description="Post an approved gross salary above, or choose another month or status."
          />
        ) : (
          <section className="panel overflow-hidden">
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Salary records"
            >
              <table className="w-full min-w-250 text-sm">
                <thead className="bg-muted/70">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium">
                      Salary record
                    </th>
                    <th className="py-3 text-left font-medium">Staff</th>
                    <th className="py-3 text-right font-medium">Gross</th>
                    <th className="py-3 text-right font-medium">Net due</th>
                    <th className="py-3 text-right font-medium">Paid</th>
                    <th className="py-3 text-right font-medium">Outstanding</th>
                    <th className="py-3 text-left font-medium">Payment</th>
                    <th className="px-5 py-3 text-left font-medium">SSNIT</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="px-5 py-4">
                        <Link
                          href={`/financials/salary-deductions/${row.id}`}
                          className="font-mono text-xs font-semibold text-primary hover:underline"
                        >
                          {row.salaryNumber}
                        </Link>
                      </td>
                      <td className="py-4">
                        <p className="font-semibold">{row.staffName}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.staffNumber} · {row.position}
                        </p>
                      </td>
                      <td className="py-4 text-right">
                        <Money value={row.grossSalary} />
                      </td>
                      <td className="py-4 text-right">
                        <Money value={row.netSalary} />
                      </td>
                      <td className="py-4 text-right">
                        <Money value={row.cashPosition?.salaryPaid ?? "0.00"} />
                      </td>
                      <td className="py-4 text-right font-semibold">
                        <Money
                          value={
                            row.cashPosition?.salaryOutstanding ?? row.netSalary
                          }
                        />
                      </td>
                      <td className="py-4">
                        <StatusBadge
                          status={
                            row.status === "reversed"
                              ? "Reversed"
                              : row.cashPosition?.salaryPaymentStatus === "paid"
                                ? "Paid"
                                : row.cashPosition?.salaryPaymentStatus ===
                                    "partial"
                                  ? "Partially Paid"
                                  : "Unpaid"
                          }
                        />
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge
                          status={
                            row.status === "reversed"
                              ? "Reversed"
                              : row.cashPosition?.ssnitStatus === "remitted"
                                ? "Remitted"
                                : row.cashPosition?.ssnitStatus === "partial"
                                  ? "Partially Remitted"
                                  : row.cashPosition?.ssnitStatus === "due"
                                    ? "Due"
                                    : "Not Due"
                          }
                        />
                        {row.reversalNumber && (
                          <p className="mt-1 font-mono text-xs text-muted-foreground">
                            {row.reversalNumber}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result.pageCount > 1 && (
              <div className="flex items-center justify-end gap-2 border-t p-4">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  disabled={result.page <= 1}
                >
                  <Link href={`?${search.toString()}&page=${result.page - 1}`}>
                    <ChevronLeft />
                    Previous
                  </Link>
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {result.page} of {result.pageCount}
                </span>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  disabled={result.page >= result.pageCount}
                >
                  <Link href={`?${search.toString()}&page=${result.page + 1}`}>
                    Next
                    <ChevronRight />
                  </Link>
                </Button>
              </div>
            )}
          </section>
        )}
      </div>
    </>
  );
}

function Summary({
  label,
  value,
  primary = false,
}: {
  label: string;
  value: string;
  primary?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${primary ? "border-primary/20 bg-brand-subtle/60" : "bg-card"}`}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-3 text-2xl font-semibold tabular-nums">
        <Money value={value} />
      </p>
    </div>
  );
}

function InlineAmount({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-muted-foreground">
      {label}{" "}
      <strong className="font-semibold text-foreground">
        <Money value={value} />
      </strong>
    </span>
  );
}
