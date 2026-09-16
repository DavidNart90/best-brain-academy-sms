import Link from "next/link";
import { Search } from "lucide-react";
import { DataTablePagination } from "@/components/data-display/data-table-pagination";
import { Money } from "@/components/data-display/money";
import {
  PageState,
  PermissionDenied,
} from "@/components/data-display/page-state";
import { PageHeader } from "@/components/layout/page-header";
import { LiveFilterForm } from "@/components/layout/live-filter-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EndTermInvoiceManager } from "@/features/finance/components/end-term-invoice-manager";
import { getEndTermInvoicesPage } from "@/features/finance/server/queries";
import { requirePermission } from "@/lib/auth/access";
import { hasPermission } from "@/lib/permissions/contracts";

function pageHref(
  query: Awaited<ReturnType<typeof getEndTermInvoicesPage>>["query"],
  page?: number,
) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.classId) params.set("classId", String(query.classId));
  if (page && page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return suffix
    ? `/financials/end-of-term-invoices?${suffix}`
    : "/financials/end-of-term-invoices";
}

export default async function EndTermInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requirePermission("finance.end_term_invoices.read");
  if (!context) return <PermissionDenied />;
  const result = await getEndTermInvoicesPage(await searchParams);
  const canManage = hasPermission(context, "finance.end_term_invoices.manage");
  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <>
      <PageHeader
        title="End-of-term invoices"
        description="Prepare next-term school fees, Books & Prospectus, prior balances and parent notes for controlled batch printing."
      />
      <div className="space-y-5">
        <EndTermInvoiceManager
          setup={result.setup}
          classes={result.classes}
          canManage={canManage}
          invoiceCount={result.total}
        />

        <LiveFilterForm
          ariaLabel="Filter end-of-term invoices"
          className="panel grid gap-3 p-5 sm:grid-cols-[minmax(15rem,1fr)_15rem_auto]"
        >
          <div className="field">
            <label htmlFor="end-term-search" className="field-label">
              Student, admission number or invoice
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="end-term-search"
                name="q"
                defaultValue={result.query.q}
                maxLength={80}
                placeholder="Search issued invoices"
                className="pl-9"
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="end-term-list-class" className="field-label">
              Class
            </label>
            <select
              id="end-term-list-class"
              name="classId"
              defaultValue={result.query.classId ?? ""}
              className="native-select w-full"
            >
              <option value="">All classes</option>
              {result.classes.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>
                  {schoolClass.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button asChild variant="ghost">
              <Link href="/financials/end-of-term-invoices">Clear</Link>
            </Button>
          </div>
        </LiveFilterForm>

        {result.total === 0 ? (
          <PageState
            kind="empty"
            title="No end-of-term invoices in this view"
            description={
              result.setup.configurationId
                ? "Generate the first controlled batch above, or change the filters."
                : "Save the parent note, configure next-term charges, then generate the first batch."
            }
          />
        ) : (
          <section className="panel overflow-hidden">
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="End-of-term invoices"
            >
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/70 hover:bg-muted/70">
                    <TableHead className="pl-5">Invoice</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Next term</TableHead>
                    <TableHead className="text-right">
                      Previous balance
                    </TableHead>
                    <TableHead className="text-right">Next-term fees</TableHead>
                    <TableHead className="pr-5 text-right">Plan for</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.rows.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="pl-5">
                        <Link
                          href={`/financials/end-of-term-invoices/${invoice.id}`}
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
                      <TableCell>{invoice.className}</TableCell>
                      <TableCell>
                        {invoice.academicYearName} · {invoice.academicTermName}
                      </TableCell>
                      <TableCell className="text-right">
                        <Money value={invoice.previousBalance} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Money value={invoice.total} />
                      </TableCell>
                      <TableCell className="pr-5 text-right font-semibold">
                        <Money value={invoice.totalToPlanFor} />
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
              hrefForPage={(page) => pageHref(result.query, page)}
              itemLabel="invoices"
            />
          </section>
        )}
      </div>
    </>
  );
}
