import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Money } from "@/components/data-display/money";
import {
  PageState,
  PermissionDenied,
} from "@/components/data-display/page-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { DocumentHeader } from "@/features/finance/components/document-header";
import { OutstandingFeesTable } from "@/features/finance/components/outstanding-fees-table";
import { PrintInvoiceButton } from "@/features/finance/components/print-invoice-button";
import { outstandingFeesHref } from "@/features/finance/outstanding-query";
import {
  getOutstandingInvoices,
  getOutstandingReportIdentity,
} from "@/features/finance/server/queries";
import { requirePermission } from "@/lib/auth/access";

function sumMoney(values: string[]) {
  const total = values.reduce((sum, value) => {
    const [whole = "0", fraction = ""] = value.split(".");
    return sum + BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  }, 0n);
  return `${total / 100n}.${String(total % 100n).padStart(2, "0")}`;
}

export default async function OutstandingFeesPrintPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requirePermission("finance.outstanding.print");
  if (!context) return <PermissionDenied />;

  const rawQuery = await searchParams;
  const [result, identity] = await Promise.all([
    getOutstandingInvoices(rawQuery, { mode: "print" }),
    getOutstandingReportIdentity(),
  ]);
  const selectedClass = result.classes.find(
    (item) => item.id === result.query.classId,
  );
  const selectedTerm = result.terms.find(
    (item) => item.id === result.query.academicTermId,
  );
  const totalOutstanding = sumMoney(result.rows.map((row) => row.outstanding));

  return (
    <>
      <PageHeader
        title="Print outstanding fees"
        description="This report uses the same student, class and academic-term filters as the table."
      >
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={outstandingFeesHref(result.query)}>
              <ArrowLeft /> Back to balances
            </Link>
          </Button>
          {result.rows.length > 0 && <PrintInvoiceButton />}
        </div>
      </PageHeader>

      {result.rows.length === 0 ? (
        <PageState
          kind="empty"
          title="No balances to print"
          description="Return to outstanding fees and adjust the active filters."
        />
      ) : (
        <section className="outstanding-report report-document panel overflow-hidden">
          <div className="p-5 sm:p-6">
            <DocumentHeader
              title="Outstanding Fees Report"
              reference={`${result.total} open ${result.total === 1 ? "balance" : "balances"}`}
              identity={identity}
            />
            <dl className="mt-5 grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-4">
              <ReportFilter
                label="Student / invoice"
                value={result.query.q || "All students"}
              />
              <ReportFilter
                label="Class"
                value={selectedClass?.label ?? "All classes"}
              />
              <ReportFilter
                label="Academic term"
                value={selectedTerm?.label ?? "All terms"}
              />
              <div className="bg-card px-4 py-3">
                <dt className="text-xs font-medium text-muted-foreground">
                  Total outstanding
                </dt>
                <dd className="mt-1 font-semibold text-primary">
                  <Money value={totalOutstanding} />
                </dd>
              </div>
            </dl>
          </div>
          {result.truncated && (
            <p className="mx-5 mb-4 rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-xs text-warning sm:mx-6">
              This print view is limited to the first 1,000 matching balances.
              Narrow the filters before printing the complete report.
            </p>
          )}
          <OutstandingFeesTable rows={result.rows} printMode />
        </section>
      )}
    </>
  );
}

function ReportFilter({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card px-4 py-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
