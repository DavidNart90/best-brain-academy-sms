import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  InMemoryTablePagination,
  PaginatedRows,
} from "@/components/data-display/in-memory-table-pagination";
import { Money } from "@/components/data-display/money";
import { PermissionDenied } from "@/components/data-display/page-state";
import { StatusBadge } from "@/components/data-display/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { CancelInvoiceForm } from "@/features/finance/components/invoice-actions";
import { PrintInvoiceButton } from "@/features/finance/components/print-invoice-button";
import { DocumentHeader } from "@/features/finance/components/document-header";
import { invoiceIdSchema } from "@/features/finance/schemas";
import { getInvoiceDetail } from "@/features/finance/server/queries";
import { requirePermission } from "@/lib/auth/access";
import { hasPermission } from "@/lib/permissions/contracts";

const statusLabels = {
  unpaid: "Unpaid",
  partially_paid: "Partially Paid",
  paid: "Paid",
  cancelled: "Cancelled",
} as const;
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
});
const date = (value: string | null) =>
  value ? dateFormatter.format(new Date(`${value}T00:00:00Z`)) : "Not recorded";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const context = await requirePermission("financials.read");
  if (!context) return <PermissionDenied />;
  const id = invoiceIdSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const invoice = await getInvoiceDetail(id.data);
  if (!invoice) notFound();
  const canCancel =
    hasPermission(context, "finance.transactions.manage") &&
    invoice.status !== "cancelled" &&
    Number(invoice.amountPaid) === 0;

  return (
    <>
      <PageHeader title={`Invoice ${invoice.invoiceNumber}`} description="">
        <div className="flex gap-2 print:hidden">
          <Button asChild variant="outline">
            <Link href="/financials/invoices">
              <ArrowLeft /> Invoices
            </Link>
          </Button>
          <PrintInvoiceButton />
        </div>
      </PageHeader>

      <section
        className="finance-document panel mx-auto max-w-[210mm] p-5 sm:p-8"
        aria-label="Official invoice"
      >
        <DocumentHeader
          title="Official invoice"
          reference={invoice.invoiceNumber}
          identity={{
            schoolName: invoice.schoolName,
            schoolAddress: invoice.schoolAddress,
            schoolPhone: invoice.schoolPhone,
            schoolEmail: invoice.schoolEmail,
            schoolMotto: invoice.schoolMotto,
            schoolLogoPath: invoice.schoolLogoPath,
          }}
        >
          <p className="mt-1 text-sm text-muted-foreground">
            Issued {date(invoice.issuedOn)}
          </p>
          <div className="mt-2">
            <StatusBadge status={statusLabels[invoice.status]} />
          </div>
        </DocumentHeader>

        <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-muted-foreground">
              Student
            </dt>
            <dd className="mt-1 text-sm font-semibold">
              {invoice.studentName}
            </dd>
            <dd className="text-xs text-muted-foreground">
              {invoice.admissionNumber}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">
              Class / Transport location
            </dt>
            <dd className="mt-1 text-sm font-semibold">
              {invoice.className} · {invoice.locationName}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">
              Academic period
            </dt>
            <dd className="mt-1 text-sm font-semibold">
              {invoice.academicYearName} · {invoice.academicTermName}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">
              Issued by
            </dt>
            <dd className="mt-1 text-sm font-semibold">
              {invoice.createdByName}
            </dd>
          </div>
        </dl>

        <InMemoryTablePagination
          total={invoice.lines.length}
          pageSize={10}
          itemLabel="invoice lines"
          className="rounded-b-lg border-x border-b"
        >
          <div className="mt-6 overflow-hidden rounded-t-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/70">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">
                    Description
                  </th>
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                <PaginatedRows printAll>
                  {invoice.lines.map((line) => (
                    <tr key={line.id} className="border-t">
                      <td className="px-4 py-2">{line.description}</td>
                      <td className="px-4 py-2 text-right">
                        <Money value={line.amount} />
                      </td>
                    </tr>
                  ))}
                </PaginatedRows>
              </tbody>
              <tfoot>
                <tr className="border-t">
                  <td className="px-4 py-2 text-right font-medium">Subtotal</td>
                  <td className="px-4 py-2 text-right">
                    <Money value={invoice.subtotal} />
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="px-4 py-2 text-right font-semibold">Total</td>
                  <td className="px-4 py-2 text-right font-semibold">
                    <Money value={invoice.total} />
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="px-4 py-2 text-right">Amount paid</td>
                  <td className="px-4 py-2 text-right">
                    <Money value={invoice.amountPaid} />
                  </td>
                </tr>
                <tr className="border-t bg-muted/40">
                  <td className="px-4 py-2 text-right font-semibold">
                    Outstanding balance
                  </td>
                  <td className="px-4 py-2 text-right font-semibold">
                    <Money value={invoice.outstanding} />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </InMemoryTablePagination>

        {invoice.libraryBalance && (
          <div className="mt-6 overflow-hidden rounded-lg border border-primary/25">
            <div className="flex flex-wrap items-start justify-between gap-3 bg-brand-subtle px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Separate Library bill</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Collected by the Librarian / Book Keeper; excluded from the
                  school-fee total above.
                </p>
              </div>
              <StatusBadge
                status={statusLabels[invoice.libraryBalance.status]}
              />
            </div>
            <InMemoryTablePagination
              total={1}
              pageSize={10}
              itemLabel="library charges"
            >
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">
                      Description
                    </th>
                    <th className="px-4 py-2 text-right font-medium">Billed</th>
                    <th className="px-4 py-2 text-right font-medium">Paid</th>
                    <th className="px-4 py-2 text-right font-medium">
                      Library balance
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <PaginatedRows printAll>
                    <tr className="border-t">
                      <td className="px-4 py-3">
                        {invoice.libraryBalance.description}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Money value={invoice.libraryBalance.expected} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Money value={invoice.libraryBalance.paid} />
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        <Money value={invoice.libraryBalance.outstanding} />
                      </td>
                    </tr>
                  </PaginatedRows>
                </tbody>
              </table>
            </InMemoryTablePagination>
          </div>
        )}

        {invoice.status === "cancelled" && (
          <div className="mt-5 rounded-lg border border-destructive/30 bg-danger-soft p-4 text-sm text-destructive">
            <p className="font-semibold">VOID — cancelled invoice</p>
            <p className="mt-1">
              Cancelled {date(invoice.cancelledAt)} by {invoice.cancelledByName}
              . Reference: {invoice.cancellationNumber}. Reason:{" "}
              {invoice.cancellationReason}
            </p>
          </div>
        )}

        <p className="mt-6 text-xs text-muted-foreground">
          Please quote {invoice.invoiceNumber} when making a payment or
          contacting the school about these fees. Keep your payment receipts for
          your records.
        </p>
      </section>

      {canCancel && (
        <div className="mx-auto mt-5 max-w-[210mm] print:hidden">
          <CancelInvoiceForm invoiceId={invoice.id} />
        </div>
      )}
    </>
  );
}
