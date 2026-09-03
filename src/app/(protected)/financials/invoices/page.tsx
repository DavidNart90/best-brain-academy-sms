import Link from "next/link";
import { DataTablePagination } from "@/components/data-display/data-table-pagination";
import { Money } from "@/components/data-display/money";
import {
  PageState,
  PermissionDenied,
} from "@/components/data-display/page-state";
import { StatusBadge } from "@/components/data-display/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GenerateInvoicesPanel } from "@/features/finance/components/invoice-actions";
import { getInvoicesPage } from "@/features/finance/server/queries";
import { requirePermission } from "@/lib/auth/access";
import { hasPermission } from "@/lib/permissions/contracts";

const statusLabels = {
  unpaid: "Unpaid",
  partially_paid: "Partially Paid",
  paid: "Paid",
  cancelled: "Cancelled",
} as const;

function queryHref(
  query: Awaited<ReturnType<typeof getInvoicesPage>>["query"],
  page?: number,
) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.status !== "all") params.set("status", query.status);
  if (page && page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return suffix ? `/financials/invoices?${suffix}` : "/financials/invoices";
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requirePermission("financials.read");
  if (!context) return <PermissionDenied />;
  const rawQuery = await searchParams;
  const result = await getInvoicesPage(rawQuery);
  const canGenerate = hasPermission(context, "finance.transactions.manage");
  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Term school-fee invoices with their immutable snapshot values at the time of issue."
      />
      <div className="space-y-5">
        {canGenerate && <GenerateInvoicesPanel />}
        {result.total === 0 ? (
          <PageState
            kind="empty"
            title="No invoices match this view"
            description="Generate term invoices above, or adjust the search and status filters."
          />
        ) : (
          <section className="panel overflow-hidden">
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Invoices"
            >
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/70 hover:bg-muted/70">
                    <TableHead className="px-5">Invoice</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Class / Location</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="pr-5">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.rows.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="px-5">
                        <Link
                          href={`/financials/invoices/${invoice.id}`}
                          className="font-mono text-xs font-semibold text-primary hover:underline"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{invoice.studentName}</div>
                        <div className="text-xs text-muted-foreground">
                          {invoice.admissionNumber}
                        </div>
                      </TableCell>
                      <TableCell>
                        {invoice.className} · {invoice.locationName}
                      </TableCell>
                      <TableCell>
                        {invoice.academicYearName} · {invoice.academicTermName}
                      </TableCell>
                      <TableCell className="text-right">
                        <Money value={invoice.total} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Money value={invoice.outstanding} />
                      </TableCell>
                      <TableCell className="pr-5">
                        <StatusBadge status={statusLabels[invoice.status]} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DataTablePagination
              page={result.page}
              pageCount={pageCount}
              total={result.total}
              pageSize={result.pageSize}
              hrefForPage={(page) => queryHref(result.query, page)}
              itemLabel="invoices"
            />
          </section>
        )}
      </div>
    </>
  );
}
