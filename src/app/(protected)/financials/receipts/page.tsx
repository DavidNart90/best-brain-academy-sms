import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { DataTablePagination } from "@/components/data-display/data-table-pagination";
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
import { getReceiptsPage } from "@/features/finance/server/queries";
import { requirePermission } from "@/lib/auth/access";
import { hasPermission } from "@/lib/permissions/contracts";

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requirePermission("financials.read");
  if (!context) return <PermissionDenied />;
  const result = await getReceiptsPage(await searchParams);
  const canReverse = hasPermission(context, "finance.transactions.manage");
  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));
  const params = new URLSearchParams();
  if (result.date) params.set("date", result.date);
  if (result.status !== "all") params.set("status", result.status);
  const query = params.toString();
  const hrefForPage = (page: number) => {
    const listParams = new URLSearchParams();
    if (result.q) listParams.set("q", result.q);
    if (result.date) listParams.set("date", result.date);
    if (result.status !== "all") listParams.set("status", result.status);
    if (page > 1) listParams.set("page", String(page));
    const value = listParams.toString();
    return value ? `/financials/receipts?${value}` : "/financials/receipts";
  };

  return (
    <>
      <PageHeader
        title="Receipts"
        description="Posted money received, grouped by source. Reversed receipts remain visible for audit history."
      />
      <div className="space-y-5">
        <section className="panel flex flex-wrap items-end justify-between gap-4 p-5">
          <LiveFilterForm
            ariaLabel="Filter receipts"
            className="flex flex-1 flex-wrap items-end gap-3"
          >
            <div className="field min-w-56 flex-1">
              <label htmlFor="receipt-search" className="field-label">
                Receipt, student or payer
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="receipt-search"
                  name="q"
                  defaultValue={result.q}
                  maxLength={80}
                  placeholder="Search receipts"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="receipt-date" className="text-sm font-medium">
                Business date
              </label>
              <input
                id="receipt-date"
                name="date"
                type="date"
                defaultValue={result.date}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="receipt-status" className="text-sm font-medium">
                Status
              </label>
              <select
                id="receipt-status"
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
              <Link href="/financials/receipts">Clear</Link>
            </Button>
          </LiveFilterForm>
          <Button asChild variant="outline">
            <Link
              href={
                query ? `/financials/cashflow?${query}` : "/financials/cashflow"
              }
            >
              <ArrowLeft /> Daily cashflow
            </Link>
          </Button>
        </section>
        {result.rows.length === 0 ? (
          <PageState
            kind="empty"
            title="No receipts found"
            description="Try another receipt, student, payer, business date or status. Posted receipts will appear here after a successful cashflow entry."
          />
        ) : (
          <section className="panel overflow-hidden">
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Receipts"
            >
              <table className="w-full min-w-190 text-sm">
                <thead className="bg-muted/70">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium">Receipt</th>
                    <th className="py-3 text-left font-medium">Source</th>
                    <th className="py-3 text-left font-medium">
                      Student / payer
                    </th>
                    <th className="py-3 text-left font-medium">Description</th>
                    <th className="py-3 text-left font-medium">
                      Business date
                    </th>
                    <th className="py-3 text-right font-medium">Amount</th>
                    <th className="py-3 text-left font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <tr key={`${row.source}-${row.id}`} className="border-t">
                      <td className="px-5 py-4 font-mono text-xs font-semibold">
                        <Link
                          href={`/financials/receipts/document?source=${encodeURIComponent(row.source)}&id=${row.sourceId}`}
                          className="text-primary hover:underline"
                        >
                          {row.receiptNumber}
                        </Link>
                      </td>
                      <td className="py-4">{row.source}</td>
                      <td className="py-4">{row.person}</td>
                      <td className="max-w-56 py-4">{row.description}</td>
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
                        {canReverse && row.status === "active" && (
                          <ReverseRecordForm
                            operation={row.reversalOperation}
                            recordId={row.sourceId}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DataTablePagination
              page={result.page}
              pageCount={pageCount}
              total={result.total}
              pageSize={result.pageSize}
              hrefForPage={hrefForPage}
              itemLabel="receipts"
            />
          </section>
        )}
      </div>
    </>
  );
}
