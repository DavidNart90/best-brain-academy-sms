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
import { SalaryEntryForm } from "@/features/finance/components/salary-forms";
import {
  getSalaryFormOptions,
  getSalaryPage,
} from "@/features/finance/server/salary-queries";
import { requirePermission } from "@/lib/auth/access";
import { hasPermission } from "@/lib/permissions/contracts";

const monthName = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));

export default async function SalaryDeductionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requirePermission("financials.read");
  if (!context) return <PermissionDenied />;
  const result = await getSalaryPage(await searchParams);
  const options = hasPermission(context, "finance.transactions.manage")
    ? await getSalaryFormOptions()
    : null;
  const search = new URLSearchParams({
    month: result.month,
    q: result.q,
    status: result.status,
  });

  return (
    <>
      <PageHeader
        title="Salaries & deductions"
        description="Monthly gross salary, approved deductions and final net position. This register does not run PAYE, pensions or payslips."
      >
        <Button asChild variant="outline">
          <Link href="/settings/financials">
            <Settings2 />
            Deduction settings
          </Link>
        </Button>
      </PageHeader>
      <div className="space-y-5">
        {options && (
          <SalaryEntryForm staff={options.staff} payrollMonth={result.month} />
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
                  Status
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
        </section>
        <section
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Monthly salary totals"
        >
          <Summary label="Gross salary" value={result.grossSalary} />
          <Summary label="Deductions" value={result.totalDeductions} />
          <Summary label="Net salary" value={result.netSalary} primary />
          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              Active staff records
            </p>
            <p className="mt-3 text-2xl font-semibold tabular-nums">
              {result.activeCount}
            </p>
          </div>
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
              <table className="w-full min-w-220 text-sm">
                <thead className="bg-muted/70">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium">
                      Salary record
                    </th>
                    <th className="py-3 text-left font-medium">Staff</th>
                    <th className="py-3 text-left font-medium">Position</th>
                    <th className="py-3 text-right font-medium">Gross</th>
                    <th className="py-3 text-right font-medium">Deductions</th>
                    <th className="py-3 text-right font-medium">Net</th>
                    <th className="px-5 py-3 text-left font-medium">Status</th>
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
                          {row.staffNumber}
                        </p>
                      </td>
                      <td className="py-4">{row.position}</td>
                      <td className="py-4 text-right">
                        <Money value={row.grossSalary} />
                      </td>
                      <td className="py-4 text-right">
                        <Money value={row.totalDeductions} />
                      </td>
                      <td className="py-4 text-right font-semibold">
                        <Money value={row.netSalary} />
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge
                          status={
                            row.status === "active" ? "Active" : "Reversed"
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
