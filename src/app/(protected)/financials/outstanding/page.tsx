import Link from "next/link";
import { Printer } from "lucide-react";
import { DataTablePagination } from "@/components/data-display/data-table-pagination";
import {
  PageState,
  PermissionDenied,
} from "@/components/data-display/page-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { OutstandingFeesFilters } from "@/features/finance/components/outstanding-fees-filters";
import { OutstandingFeesTable } from "@/features/finance/components/outstanding-fees-table";
import { outstandingFeesHref } from "@/features/finance/outstanding-query";
import { getOutstandingInvoices } from "@/features/finance/server/queries";
import { requirePermission } from "@/lib/auth/access";
import { hasPermission } from "@/lib/permissions/contracts";

export default async function OutstandingFeesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requirePermission("finance.outstanding.read");
  if (!context) return <PermissionDenied />;

  const result = await getOutstandingInvoices(await searchParams);
  const canOpenStudents = hasPermission(context, "students.read");
  const canOpenInvoices = hasPermission(context, "financials.read");
  const canPrint = hasPermission(context, "finance.outstanding.print");
  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));
  const hasFilters = Boolean(
    result.query.q || result.query.classId || result.query.academicTermId,
  );

  return (
    <>
      <PageHeader
        title="Outstanding fees"
        description="Review unpaid and partially paid student balances. This workspace does not record payments."
      >
        {canPrint && result.total > 0 && (
          <Button asChild variant="outline">
            <Link
              href={outstandingFeesHref(result.query, {
                pathname: "/financials/outstanding/print",
              })}
            >
              <Printer /> Print filtered report
            </Link>
          </Button>
        )}
      </PageHeader>

      <section
        className="panel overflow-hidden"
        aria-labelledby="outstanding-table-title"
      >
        <div className="border-b p-5">
          <div className="mb-5">
            <h2
              id="outstanding-table-title"
              className="text-base font-semibold"
            >
              Student balances
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {result.total} matching open{" "}
              {result.total === 1 ? "balance" : "balances"}
            </p>
          </div>
          <OutstandingFeesFilters
            query={result.query}
            classes={result.classes}
            terms={result.terms}
          />
        </div>

        {result.rows.length === 0 ? (
          <div className="p-5">
            <PageState
              kind="empty"
              title="No outstanding balances"
              description={
                hasFilters
                  ? "No open invoices match the selected student, class and academic-term filters."
                  : "There are no unpaid or partially paid invoices to display."
              }
            />
          </div>
        ) : (
          <>
            <OutstandingFeesTable
              rows={result.rows}
              canOpenStudents={canOpenStudents}
              canOpenInvoices={canOpenInvoices}
            />
            <DataTablePagination
              page={result.page}
              pageCount={pageCount}
              total={result.total}
              pageSize={result.pageSize}
              hrefForPage={(page) =>
                outstandingFeesHref(result.query, { page })
              }
              itemLabel={result.total === 1 ? "balance" : "balances"}
            />
          </>
        )}
      </section>
    </>
  );
}
