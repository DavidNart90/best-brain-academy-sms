import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  PageState,
  PermissionDenied,
} from "@/components/data-display/page-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EndTermInvoiceDocument } from "@/features/finance/components/end-term-invoice-document";
import { PrintInvoiceButton } from "@/features/finance/components/print-invoice-button";
import { getEndTermInvoicesPage } from "@/features/finance/server/queries";
import { requirePermission } from "@/lib/auth/access";

function printHref(classId: number | null, page: number) {
  const params = new URLSearchParams();
  if (classId) params.set("classId", String(classId));
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return suffix
    ? `/financials/end-of-term-invoices/print?${suffix}`
    : "/financials/end-of-term-invoices/print";
}

export default async function EndTermInvoicePrintPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requirePermission("finance.end_term_invoices.read");
  if (!context) return <PermissionDenied />;
  const result = await getEndTermInvoicesPage(await searchParams, {
    pageSize: 25,
  });
  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <>
      <PageHeader
        title="Print end-of-term invoices"
        description={`Batch ${result.page} of ${pageCount} · up to 25 invoices per print request.`}
      >
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button asChild variant="outline">
            <Link href="/financials/end-of-term-invoices">
              <ArrowLeft /> Back to run
            </Link>
          </Button>
          {result.page > 1 ? (
            <Button asChild variant="outline">
              <Link href={printHref(result.query.classId, result.page - 1)}>
                <ArrowLeft /> Previous batch
              </Link>
            </Button>
          ) : null}
          {result.page < pageCount ? (
            <Button asChild variant="outline">
              <Link href={printHref(result.query.classId, result.page + 1)}>
                Next batch <ArrowRight />
              </Link>
            </Button>
          ) : null}
          <PrintInvoiceButton />
        </div>
      </PageHeader>
      {result.rows.length === 0 ? (
        <PageState
          kind="empty"
          title="No invoices to print"
          description="Return to the closing run and generate invoices first."
        />
      ) : (
        <div className="space-y-5 print:space-y-0">
          {result.rows.map((invoice) => (
            <EndTermInvoiceDocument
              key={invoice.id}
              invoice={invoice}
              printSheet
            />
          ))}
        </div>
      )}
    </>
  );
}
