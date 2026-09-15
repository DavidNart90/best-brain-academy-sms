import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PermissionDenied } from "@/components/data-display/page-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EndTermInvoiceDocument } from "@/features/finance/components/end-term-invoice-document";
import { PrintInvoiceButton } from "@/features/finance/components/print-invoice-button";
import { invoiceIdSchema } from "@/features/finance/schemas";
import { getEndTermInvoiceDetail } from "@/features/finance/server/queries";
import { requirePermission } from "@/lib/auth/access";

export default async function EndTermInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const context = await requirePermission("finance.end_term_invoices.read");
  if (!context) return <PermissionDenied />;
  const id = invoiceIdSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const invoice = await getEndTermInvoiceDetail(id.data);
  if (!invoice) notFound();

  return (
    <>
      <PageHeader
        title={`End-of-term invoice ${invoice.invoiceNumber}`}
        description="Next-term fees, prior balance and parent communication snapshot."
      >
        <div className="flex gap-2 print:hidden">
          <Button asChild variant="outline">
            <Link href="/financials/end-of-term-invoices">
              <ArrowLeft /> Back to run
            </Link>
          </Button>
          <PrintInvoiceButton />
        </div>
      </PageHeader>
      <EndTermInvoiceDocument invoice={invoice} />
    </>
  );
}
