import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { LiveFilterForm } from "@/components/layout/live-filter-form";
import {
  PageState,
  PermissionDenied,
} from "@/components/data-display/page-state";
import { DataTablePagination } from "@/components/data-display/data-table-pagination";
import { Money } from "@/components/data-display/money";
import { StatusBadge } from "@/components/data-display/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReverseRecordForm } from "@/features/finance/components/reverse-record-form";
import { getPaymentsPage } from "@/features/finance/server/payments";
import { paymentPageHref } from "@/features/finance/payment-query";
import { requirePermission } from "@/lib/auth/access";
import { hasPermission } from "@/lib/permissions/contracts";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requirePermission("financials.read");
  if (!context) return <PermissionDenied />;
  const result = await getPaymentsPage(await searchParams);
  const canManage = hasPermission(context, "finance.transactions.manage");
  const { query } = result;
  return (
    <>
      <PageHeader
        title="Payments"
        description="Full and partial school-fee payments. Open an invoice or receipt, and review any reversals."
      >
        {canManage && (
          <Button asChild>
            <Link href="/financials/cashflow">
              <Plus />
              Record payment
            </Link>
          </Button>
        )}
      </PageHeader>
      <LiveFilterForm
        ariaLabel="Filter payments"
        className="panel mb-5 flex flex-wrap items-end gap-3 p-5"
      >
        <div className="field">
          <label htmlFor="payment-search-by" className="field-label">
            Search by
          </label>
          <select
            id="payment-search-by"
            name="searchBy"
            defaultValue={query.searchBy}
            className="native-select"
          >
            <option value="student">Student name</option>
            <option value="invoice">Invoice number</option>
            <option value="receipt">Receipt number</option>
          </select>
        </div>
        <div className="field min-w-48 flex-1">
          <label htmlFor="payment-search" className="field-label">
            Search payments
          </label>
          <Input
            id="payment-search"
            name="q"
            maxLength={80}
            defaultValue={query.q}
            placeholder="Enter a name or reference"
          />
        </div>
        <div className="field">
          <label htmlFor="payment-date" className="field-label">
            Business date
          </label>
          <Input
            id="payment-date"
            name="date"
            type="date"
            defaultValue={query.date}
          />
        </div>
        <div className="field">
          <label htmlFor="payment-status" className="field-label">
            Status
          </label>
          <select
            id="payment-status"
            name="status"
            defaultValue={query.status}
            className="native-select"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="reversed">Reversed</option>
          </select>
        </div>
        <Button asChild variant="ghost">
          <Link href="/financials/payments">Clear filters</Link>
        </Button>
      </LiveFilterForm>
      {result.rows.length === 0 ? (
        <PageState
          kind="empty"
          title="No payments found"
          description="Adjust the filters or record a school-fee payment from Daily Cashflow."
        >
          {query.page > 1 && (
            <Link
              className="text-primary underline"
              href={paymentPageHref(query, 1)}
            >
              Return to first page
            </Link>
          )}
        </PageState>
      ) : (
        <section className="panel overflow-hidden">
          <div
            className="table-scroll"
            role="region"
            tabIndex={0}
            aria-label="Payment history"
          >
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-muted/70">
                <tr>
                  {[
                    "Payment / date",
                    "Student",
                    "Invoice",
                    "Payment method",
                    "Amount",
                    "Status",
                    "Receipt",
                    "Action",
                  ].map((title) => (
                    <th
                      key={title}
                      className={`px-4 py-3 font-medium ${title === "Amount" ? "text-right" : "text-left"}`}
                    >
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-4 py-4">
                      <p className="font-mono text-xs font-semibold">
                        {row.payment_number}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.business_date}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium">{row.student_name_snapshot}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.admission_number_snapshot}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        className="font-mono text-xs text-primary hover:underline"
                        href={`/financials/invoices/${row.invoice_id}`}
                      >
                        {row.invoice_number_snapshot}
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      {row.payment_method_name_snapshot}
                      {row.external_reference && (
                        <p className="text-xs text-muted-foreground">
                          {row.external_reference}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Money value={row.amount} />
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge
                        status={row.status === "active" ? "Active" : "Reversed"}
                      />
                      {row.reversal_reason && (
                        <p className="mt-1 max-w-48 text-xs text-muted-foreground">
                          {row.reversal_reason}
                        </p>
                      )}
                      {row.reversal_number && (
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          {row.reversal_number}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        className="font-mono text-xs text-primary hover:underline"
                        href={`/financials/receipts/document?source=School%20fee&id=${row.id}`}
                      >
                        {row.receipt_number}
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      {canManage && row.status === "active" && (
                        <ReverseRecordForm
                          operation="reverse_school_fee_payment"
                          recordId={row.id}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DataTablePagination
            page={query.page}
            pageCount={Math.max(1, Math.ceil(result.total / result.pageSize))}
            total={result.total}
            pageSize={result.pageSize}
            itemLabel="payments"
            hrefForPage={(page) => paymentPageHref(query, page)}
          />
        </section>
      )}
    </>
  );
}
