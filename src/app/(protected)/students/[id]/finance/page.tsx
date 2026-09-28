import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  InMemoryTablePagination,
  PaginatedRows,
} from "@/components/data-display/in-memory-table-pagination";
import { Money } from "@/components/data-display/money";
import {
  PageState,
  PermissionDenied,
} from "@/components/data-display/page-state";
import { StatusBadge } from "@/components/data-display/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PrintInvoiceButton } from "@/features/finance/components/print-invoice-button";
import { getStudentFinanceHistory } from "@/features/finance/server/queries";
import { requirePermission } from "@/lib/auth/access";

const invoiceStatus = {
  unpaid: "Unpaid",
  partially_paid: "Partially Paid",
  paid: "Paid",
  cancelled: "Cancelled",
} as const;

export default async function StudentFinancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const context = await requirePermission("financials.read");
  if (!context) return <PermissionDenied />;
  const studentId = Number((await params).id);
  if (!Number.isInteger(studentId) || studentId < 1)
    return (
      <PageState
        kind="error"
        title="Student not found"
        description="The student identifier is not valid."
      />
    );
  const history = await getStudentFinanceHistory(studentId);
  if (!history)
    return (
      <PageState
        kind="empty"
        title="Student not found"
        description="This student record could not be found."
      />
    );
  const balance =
    history.invoices.reduce(
      (sum, invoice) => sum + Math.round(Number(invoice.outstanding) * 100),
      0,
    ) / 100;
  const paymentNumberById = new Map(
    history.payments.map((payment) => [payment.id, payment.payment_number]),
  );

  return (
    <>
      <PageHeader
        title="Student financial account"
        description={`${history.student.full_name} · ${history.student.admission_number}`}
      >
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button asChild variant="outline">
            <Link href={`/students/${studentId}`}>
              <ArrowLeft /> Student profile
            </Link>
          </Button>
          <PrintInvoiceButton />
        </div>
      </PageHeader>
      <div className="space-y-5">
        <section
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Student account summary"
        >
          <Summary label="Invoices" value={String(history.invoices.length)} />
          <Summary
            label="Open balance"
            value={<Money value={balance.toFixed(2)} />}
          />
          <Summary label="Payments" value={String(history.payments.length)} />
          <Summary label="Receipts" value={String(history.receipts.length)} />
        </section>
        <section
          className="panel overflow-hidden"
          aria-labelledby="student-invoices-title"
        >
          <div className="border-b p-5">
            <h2 id="student-invoices-title" className="text-base font-semibold">
              Invoices
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Historical invoice snapshots and current balances.
            </p>
          </div>
          <InMemoryTablePagination
            total={history.invoices.length}
            pageSize={10}
            itemLabel="invoices"
          >
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Student invoices"
            >
              <table className="w-full min-w-170 text-sm">
                <thead className="bg-muted/70">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium">Invoice</th>
                    <th className="py-3 text-left font-medium">Issued</th>
                    <th className="py-3 text-left font-medium">
                      Class / location
                    </th>
                    <th className="py-3 text-right font-medium">Total</th>
                    <th className="py-3 text-right font-medium">Paid</th>
                    <th className="py-3 text-right font-medium">Outstanding</th>
                    <th className="px-5 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <PaginatedRows printAll>
                    {history.invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-t">
                        <td className="px-5 py-4">
                          <Link
                            href={`/financials/invoices/${invoice.id}`}
                            className="font-mono text-xs font-semibold text-primary hover:underline"
                          >
                            {invoice.invoice_number}
                          </Link>
                        </td>
                        <td className="py-4">{invoice.issued_on}</td>
                        <td className="py-4">
                          {invoice.class_name_snapshot} ·{" "}
                          {invoice.location_name_snapshot}
                        </td>
                        <td className="py-4 text-right">
                          <Money value={invoice.total} />
                        </td>
                        <td className="py-4 text-right">
                          <Money value={invoice.amountPaid} />
                        </td>
                        <td className="py-4 text-right font-semibold">
                          <Money value={invoice.outstanding} />
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge
                            status={
                              invoiceStatus[
                                invoice.status as keyof typeof invoiceStatus
                              ]
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </PaginatedRows>
                </tbody>
              </table>
            </div>
          </InMemoryTablePagination>
        </section>
        <section
          className="panel overflow-hidden"
          aria-labelledby="student-payments-title"
        >
          <div className="border-b p-5">
            <h2 id="student-payments-title" className="text-base font-semibold">
              School-fee payments
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Posted payments remain visible when later reversed.
            </p>
          </div>
          <InMemoryTablePagination
            total={history.payments.length}
            pageSize={10}
            itemLabel="payments"
          >
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Student school-fee payments"
            >
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-muted/70">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium">Payment</th>
                    <th className="py-3 text-left font-medium">Invoice</th>
                    <th className="py-3 text-left font-medium">
                      Business date
                    </th>
                    <th className="py-3 text-right font-medium">Amount</th>
                    <th className="px-5 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <PaginatedRows printAll>
                    {history.payments.map((payment) => (
                      <tr key={payment.id} className="border-t">
                        <td className="px-5 py-4 font-mono text-xs">
                          {payment.payment_number}
                        </td>
                        <td className="py-4">
                          {history.invoices.find(
                            (invoice) => invoice.id === payment.invoice_id,
                          )?.invoice_number ?? "—"}
                        </td>
                        <td className="py-4">{payment.business_date}</td>
                        <td className="py-4 text-right">
                          <Money value={payment.amount} />
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge
                            status={
                              payment.status === "active"
                                ? "Active"
                                : "Reversed"
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </PaginatedRows>
                </tbody>
              </table>
            </div>
          </InMemoryTablePagination>
        </section>
        <section
          className="panel overflow-hidden"
          aria-labelledby="student-receipts-title"
        >
          <div className="border-b p-5">
            <h2 id="student-receipts-title" className="text-base font-semibold">
              Receipts
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Official school-fee receipts issued for this student.
            </p>
          </div>
          <InMemoryTablePagination
            total={history.receipts.length}
            pageSize={10}
            itemLabel="receipts"
          >
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Student school-fee receipts"
            >
              <table className="w-full min-w-[680px] text-sm">
                <thead className="bg-muted/70">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium">Receipt</th>
                    <th className="py-3 text-left font-medium">Payment</th>
                    <th className="py-3 text-left font-medium">
                      Business date
                    </th>
                    <th className="py-3 text-right font-medium">Amount</th>
                    <th className="py-3 text-right font-medium">
                      Remaining balance
                    </th>
                    <th className="px-5 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <PaginatedRows printAll>
                    {history.receipts.map((receipt) => (
                      <tr key={receipt.id} className="border-t">
                        <td className="px-5 py-4">
                          <Link
                            href={`/financials/receipts/document?source=School%20fee&id=${receipt.payment_id}`}
                            className="font-mono text-xs font-semibold text-primary hover:underline"
                          >
                            {receipt.receipt_number}
                          </Link>
                        </td>
                        <td className="py-4 font-mono text-xs">
                          {paymentNumberById.get(receipt.payment_id) ?? "—"}
                        </td>
                        <td className="py-4">{receipt.business_date}</td>
                        <td className="py-4 text-right">
                          <Money value={receipt.amount} />
                        </td>
                        <td className="py-4 text-right font-semibold">
                          <Money value={receipt.remainingBalance} />
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge
                            status={
                              receipt.status === "active"
                                ? "Active"
                                : "Reversed"
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </PaginatedRows>
                </tbody>
              </table>
            </div>
          </InMemoryTablePagination>
        </section>
      </div>
    </>
  );
}

function Summary({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-3 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
