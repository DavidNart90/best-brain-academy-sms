import { Money } from "@/components/data-display/money";
import { StatusBadge } from "@/components/data-display/status-badge";
import { DocumentHeader } from "./document-header";
import type { EndTermInvoiceDocument as EndTermInvoiceDocumentType } from "../types";

const statusLabels = {
  unpaid: "Unpaid",
  partially_paid: "Partially Paid",
  paid: "Paid",
  cancelled: "Cancelled",
} as const;
const dateFormatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });

export function EndTermInvoiceDocument({
  invoice,
  printSheet = false,
}: {
  invoice: EndTermInvoiceDocumentType;
  printSheet?: boolean;
}) {
  return (
    <section
      className={`finance-document panel mx-auto max-w-[210mm] p-5 sm:p-8 ${printSheet ? "end-term-print-sheet" : ""}`}
      aria-label={`End-of-term invoice ${invoice.invoiceNumber}`}
    >
      <DocumentHeader
        title="End-of-term invoice"
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
          Issued{" "}
          {dateFormatter.format(new Date(`${invoice.issuedOn}T00:00:00Z`))}
        </p>
        <div className="mt-2">
          <StatusBadge status={statusLabels[invoice.status]} />
        </div>
      </DocumentHeader>

      <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Student</dt>
          <dd className="mt-1 text-sm font-semibold">{invoice.studentName}</dd>
          <dd className="text-xs text-muted-foreground">
            {invoice.admissionNumber}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">
            Current class / Transport location
          </dt>
          <dd className="mt-1 text-sm font-semibold">
            {invoice.className} · {invoice.locationName}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">
            Closing period
          </dt>
          <dd className="mt-1 text-sm font-semibold">
            {invoice.sourceAcademicYearName} · {invoice.sourceTermName}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">
            New invoice period
          </dt>
          <dd className="mt-1 text-sm font-semibold">
            {invoice.academicYearName} · {invoice.academicTermName}
          </dd>
        </div>
      </dl>

      <div className="mt-6 overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/70">
            <tr>
              <th className="px-4 py-2 text-left font-medium">
                Next-term school fees
              </th>
              <th className="px-4 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line) => (
              <tr key={line.id} className="border-t">
                <td className="px-4 py-2">{line.description}</td>
                <td className="px-4 py-2 text-right">
                  <Money value={line.amount} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t bg-muted/35">
              <td className="px-4 py-2 text-right font-semibold">
                Next-term school-fee invoice
              </td>
              <td className="px-4 py-2 text-right font-semibold">
                <Money value={invoice.total} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-5 overflow-hidden rounded-lg border border-primary/25">
        <div className="bg-brand-subtle px-4 py-3">
          <h2 className="text-sm font-semibold">Family planning summary</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Previous balance and Books & Prospectus remain separate from the new
            school-fee invoice.
          </p>
        </div>
        <dl className="divide-y text-sm">
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt>Balance owed from {invoice.sourceTermName}</dt>
            <dd className="font-semibold">
              <Money value={invoice.previousBalance} />
            </dd>
          </div>
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt>{invoice.academicTermName} school fees</dt>
            <dd className="font-semibold">
              <Money value={invoice.total} />
            </dd>
          </div>
          <div className="flex justify-between gap-4 px-4 py-3">
            <dt>{invoice.academicTermName} Books & Prospectus</dt>
            <dd className="font-semibold">
              <Money value={invoice.prospectusAmount} />
            </dd>
          </div>
          <div className="flex justify-between gap-4 bg-muted/35 px-4 py-3">
            <dt className="font-semibold">Total to plan for</dt>
            <dd className="font-semibold">
              <Money value={invoice.totalToPlanFor} />
            </dd>
          </div>
        </dl>
      </div>

      {invoice.parentNotes ? (
        <div className="mt-5 rounded-lg border p-4">
          <h2 className="text-sm font-semibold">Note to parent / guardian</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {invoice.parentNotes}
          </p>
        </div>
      ) : null}

      <p className="mt-5 text-xs leading-5 text-muted-foreground">
        Quote {invoice.invoiceNumber} when paying the new-term school fees. Any
        previous balance must be paid against its original invoice; Books &
        Prospectus is collected separately by the Librarian / Book Keeper.
      </p>
    </section>
  );
}
