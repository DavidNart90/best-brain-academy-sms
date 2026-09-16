import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { Money } from "@/components/data-display/money";
import {
  PageState,
  PermissionDenied,
} from "@/components/data-display/page-state";
import { StatusBadge } from "@/components/data-display/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { LiveFilterForm } from "@/components/layout/live-filter-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReverseRecordForm } from "@/features/finance/components/reverse-record-form";
import { getExpensesPage } from "@/features/finance/server/queries";
import { requirePermission } from "@/lib/auth/access";
import { hasPermission } from "@/lib/permissions/contracts";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requirePermission("financials.read");
  if (!context) return <PermissionDenied />;
  const result = await getExpensesPage(await searchParams);
  const canVoid = hasPermission(context, "finance.transactions.manage");

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Posted outgoing amounts by category. Voided expenses remain visible and are excluded from active cashflow."
      />
      <div className="space-y-5">
        <section className="panel flex flex-wrap items-end justify-between gap-4 p-5">
          <LiveFilterForm
            ariaLabel="Filter expenses"
            className="flex flex-1 flex-wrap items-end gap-3"
          >
            <div className="field min-w-56 flex-1">
              <label htmlFor="expense-search" className="field-label">
                Expense, category or description
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="expense-search"
                  name="q"
                  defaultValue={result.q}
                  maxLength={80}
                  placeholder="Search expenses"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="expense-date" className="text-sm font-medium">
                Business date
              </label>
              <input
                id="expense-date"
                name="date"
                type="date"
                defaultValue={result.date}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="expense-status" className="text-sm font-medium">
                Status
              </label>
              <select
                id="expense-status"
                name="status"
                defaultValue={result.status}
                className="native-select"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="reversed">Reversed</option>
              </select>
            </div>
            <Button asChild type="button" variant="ghost">
              <Link href="/financials/expenses">Clear</Link>
            </Button>
          </LiveFilterForm>
          <Button asChild variant="outline">
            <Link href="/financials/cashflow">
              <ArrowLeft /> Daily cashflow
            </Link>
          </Button>
        </section>
        {result.rows.length === 0 ? (
          <PageState
            kind="empty"
            title="No expenses found"
            description="Try another expense, category, business date or status. Posted expenses will appear here after a successful cashflow entry."
          />
        ) : (
          <section className="panel overflow-hidden">
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Expenses"
            >
              <table className="w-full min-w-180 text-sm">
                <thead className="bg-muted/70">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium">Expense</th>
                    <th className="py-3 text-left font-medium">Category</th>
                    <th className="py-3 text-left font-medium">Description</th>
                    <th className="py-3 text-left font-medium">
                      Payment method
                    </th>
                    <th className="py-3 text-left font-medium">Date</th>
                    <th className="py-3 text-right font-medium">Amount</th>
                    <th className="py-3 text-left font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="px-5 py-4 font-mono text-xs font-semibold">
                        <Link
                          href={`/financials/expenses/document?id=${row.id}`}
                          className="text-primary hover:underline"
                        >
                          {row.expenseNumber}
                        </Link>
                      </td>
                      <td className="py-4">{row.category}</td>
                      <td className="max-w-56 py-4">{row.description}</td>
                      <td className="py-4">{row.paymentMethod}</td>
                      <td className="py-4">{row.businessDate}</td>
                      <td className="py-4 text-right">
                        <Money value={row.amount} />
                      </td>
                      <td className="py-4">
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
                      <td className="px-5 py-4 text-right">
                        {canVoid && row.status === "active" && (
                          <ReverseRecordForm
                            operation="void_expense"
                            recordId={row.id}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
