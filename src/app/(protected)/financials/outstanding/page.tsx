import Link from "next/link";
import { Search } from "lucide-react";
import { Money } from "@/components/data-display/money";
import {
  PageState,
  PermissionDenied,
} from "@/components/data-display/page-state";
import { StatusBadge } from "@/components/data-display/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { getOutstandingInvoices } from "@/features/finance/server/queries";
import { requirePermission } from "@/lib/auth/access";

export default async function OutstandingFeesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requirePermission("financials.read");
  if (!context) return <PermissionDenied />;
  const result = await getOutstandingInvoices(await searchParams);

  return (
    <>
      <PageHeader
        title="Outstanding fees"
        description="Active invoice balances by student. This view shows charges still owed, not money collected."
      />
      <div className="space-y-5">
        <section className="panel p-5">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="min-w-64 space-y-2">
              <label
                htmlFor="outstanding-search"
                className="text-sm font-medium"
              >
                Search student or invoice
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  id="outstanding-search"
                  name="q"
                  defaultValue={result.search}
                  placeholder="Name, admission number or invoice"
                  className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>
            </div>
            <Button type="submit" variant="outline">
              Search balances
            </Button>
          </form>
        </section>

        {result.rows.length === 0 ? (
          <PageState
            kind="empty"
            title="No outstanding balances"
            description={
              result.search
                ? "No open invoices matched this search."
                : "There are no unpaid or partially paid invoices to display."
            }
          />
        ) : (
          <section className="panel overflow-hidden">
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Outstanding invoice balances"
            >
              <table className="w-full min-w-190 text-sm">
                <thead className="bg-muted/70">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium">Student</th>
                    <th className="py-3 text-left font-medium">Invoice</th>
                    <th className="py-3 text-left font-medium">
                      Class / location
                    </th>
                    <th className="py-3 text-right font-medium">Total</th>
                    <th className="py-3 text-right font-medium">Paid</th>
                    <th className="py-3 text-right font-medium">Outstanding</th>
                    <th className="py-3 text-left font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">View</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="px-5 py-4">
                        <p className="font-medium">{row.studentName}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.admissionNumber}
                        </p>
                      </td>
                      <td className="py-4">
                        <Link
                          href={`/financials/invoices/${row.id}`}
                          className="font-mono text-xs font-semibold text-primary hover:underline"
                        >
                          {row.invoiceNumber}
                        </Link>
                      </td>
                      <td className="py-4">
                        {row.className} · {row.locationName}
                      </td>
                      <td className="py-4 text-right">
                        <Money value={row.total} />
                      </td>
                      <td className="py-4 text-right">
                        <Money value={row.amountPaid} />
                      </td>
                      <td className="py-4 text-right font-semibold">
                        <Money value={row.outstanding} />
                      </td>
                      <td className="py-4">
                        <StatusBadge
                          status={
                            row.amountPaid === "0.00"
                              ? "Unpaid"
                              : "Partially Paid"
                          }
                        />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/financials/invoices/${row.id}`}>
                            Open
                          </Link>
                        </Button>
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
