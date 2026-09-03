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
      <section className="panel mx-auto max-w-[180mm] p-8 print:border-0 print:shadow-none">
        <div className="flex items-start justify-between border-b pb-5">
          <div>
            <h2 className="text-lg font-semibold">Best Brain Academy</h2>
            <p className="text-sm text-muted-foreground">
              Official receipt · {source}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm font-semibold">
              {field("receipt_number")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {field("business_date")}
            </p>
          </div>
        </div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <Detail
            label="Student / payer"
            value={
              field("student_name_snapshot") === "Not recorded"
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
        </dl>
        <div className="mt-8 flex items-center justify-between border-t pt-5">
          <span className="text-base font-semibold">Amount received</span>
          <Money value={field("amount")} />
        </div>
        {source === "School fee" && (
          <div className="mt-5 grid gap-3 border-t pt-5 text-sm sm:grid-cols-2">
            <Detail
              label="Previous balance"
              value={<Money value={field("previous_balance")} />}
            />
            <Detail
              label="Remaining balance"
              value={<Money value={field("remaining_balance")} />}
            />
            <Detail label="Invoice" value={field("invoice_number_snapshot")} />
          </div>
        )}
        {record.status === "reversed" && (
          <div className="mt-6 rounded-lg border border-destructive/30 bg-danger-soft p-4 text-sm text-destructive">
            <p className="font-semibold">REVERSED</p>
            <p className="mt-1">{field("reversal_reason")}</p>
          </div>
        )}
        <p className="mt-8 border-t pt-4 text-xs text-muted-foreground">
          This receipt reflects the recorded transaction and remains available
          for audit history.
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
