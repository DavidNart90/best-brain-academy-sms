import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Money } from "@/components/data-display/money";
import {
  PageState,
  PermissionDenied,
} from "@/components/data-display/page-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PrintInvoiceButton } from "@/features/finance/components/print-invoice-button";
import { DocumentHeader } from "@/features/finance/components/document-header";
import { getReceiptDocument } from "@/features/finance/server/queries";
import { requirePermission } from "@/lib/auth/access";

const sources = [
  "School fee",
  "Feeding",
  "Admission",
  "Miscellaneous",
] as const;

export default async function ReceiptDocumentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requirePermission("financials.read");
  if (!context) return <PermissionDenied />;
  const raw = await searchParams;
  const sourceValue = Array.isArray(raw.source) ? raw.source[0] : raw.source;
  const idValue = Array.isArray(raw.id) ? raw.id[0] : raw.id;
  const source = sources.find((item) => item === sourceValue);
  const id = Number(idValue);
  if (!source || !Number.isInteger(id) || id < 1)
    return (
      <PageState
        kind="error"
        title="Receipt not found"
        description="The receipt reference is not valid."
      />
    );
  const receipt = await getReceiptDocument(source, id);
  if (!receipt)
    return (
      <PageState
        kind="empty"
        title="Receipt not found"
        description="This receipt could not be found or is not available to your account."
      />
    );
  const record = receipt as Record<string, unknown>;
  const field = (name: string) => String(record[name] ?? "Not recorded");

  return (
    <>
      <PageHeader
        title={`Receipt ${field("receipt_number")}`}
        description="Official receipt record"
      >
        <div className="flex gap-2 print:hidden">
          <Button asChild variant="outline">
            <Link href="/financials/receipts">
              <ArrowLeft /> Receipts
            </Link>
          </Button>
          <PrintInvoiceButton />
        </div>
      </PageHeader>
      <section className="finance-document panel mx-auto max-w-[210mm] p-5 sm:p-8">
        <DocumentHeader
          title="Official receipt"
          reference={field("receipt_number")}
        >
          <p className="mt-1 text-sm text-muted-foreground">
            {field("business_date")}
          </p>
        </DocumentHeader>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <Detail
            label={
              record.collection_scope === "daily_total"
                ? "Collection"
                : "Student / payer"
            }
            value={
              record.collection_scope === "daily_total"
                ? "Daily aggregate"
                : field("student_name_snapshot") === "Not recorded"
                  ? field("payer_name")
                  : field("student_name_snapshot")
            }
          />
          <Detail
            label="Description"
            value={
              source === "School fee"
                ? "School-fee payment"
                : source === "Feeding"
                  ? "Feeding collection"
                  : source === "Admission"
                    ? "Admission collection"
                    : field("description")
            }
          />
          <Detail
            label="Payment method"
            value={field("payment_method_name_snapshot")}
          />
          <Detail label="Business date" value={field("business_date")} />
          {source === "School fee" && (
            <>
              <Detail
                label="Admission number"
                value={field("admission_number_snapshot")}
              />
              <Detail label="Class" value={field("class_name_snapshot")} />
              <Detail
                label="Academic period"
                value={`${field("academic_year_name_snapshot")} · ${field("academic_term_name_snapshot")}`}
              />
              <Detail
                label="Invoice"
                value={field("invoice_number_snapshot")}
              />
            </>
          )}
        </dl>
        <div className="mt-6 overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/70">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Description</th>
                <th className="px-4 py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {source === "School fee" && (
                <tr className="border-t">
                  <td className="px-4 py-2">Balance before payment</td>
                  <td className="px-4 py-2 text-right">
                    <Money value={field("previous_balance")} />
                  </td>
                </tr>
              )}
              <tr className="border-t bg-muted/40 font-semibold">
                <td className="px-4 py-3">Amount received</td>
                <td className="px-4 py-3 text-right">
                  <Money value={field("amount")} />
                </td>
              </tr>
              {source === "School fee" && (
                <tr className="border-t">
                  <td className="px-4 py-2">Remaining balance after payment</td>
                  <td className="px-4 py-2 text-right">
                    <Money value={field("remaining_balance")} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {record.status === "reversed" && (
          <div className="mt-6 rounded-lg border border-destructive/30 bg-danger-soft p-4 text-sm text-destructive">
            <p className="font-semibold">REVERSED</p>
            <p className="mt-1">{field("reversal_reason")}</p>
          </div>
        )}
        <p className="mt-8 border-t pt-4 text-xs text-muted-foreground">
          Please keep this receipt as proof of payment and quote{" "}
          {field("receipt_number")} when contacting the school. Any balance
          shown is the balance immediately after this payment; later payments
          appear on separate receipts.
        </p>
      </section>
    </>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-semibold">{value}</dd>
    </div>
  );
}
