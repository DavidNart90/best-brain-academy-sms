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
import { getExpenseDocument } from "@/features/finance/server/queries";
import { requirePermission } from "@/lib/auth/access";

export default async function ExpenseDocumentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requirePermission("financials.read");
  if (!context) return <PermissionDenied />;
  const rawId = (await searchParams).id;
  const id = Number(Array.isArray(rawId) ? rawId[0] : rawId);
  if (!Number.isInteger(id) || id < 1)
    return (
      <PageState
        kind="error"
        title="Expense not found"
        description="The expense reference is not valid."
      />
    );
  const expense = await getExpenseDocument(id);
  if (!expense)
    return (
      <PageState
        kind="empty"
        title="Expense not found"
        description="This expense could not be found or is not available to your account."
      />
    );
  return (
    <>
      <PageHeader
        title={`Expense voucher ${expense.expense_number}`}
        description="Official expense record"
      >
        <div className="flex gap-2 print:hidden">
          <Button asChild variant="outline">
            <Link href="/financials/expenses">
              <ArrowLeft /> Expenses
            </Link>
          </Button>
          <PrintInvoiceButton />
        </div>
      </PageHeader>
      <section className="panel mx-auto max-w-[180mm] p-8 print:border-0 print:shadow-none">
        <div className="flex items-start justify-between border-b pb-5">
          <div>
            <h2 className="text-lg font-semibold">Best Brain Academy</h2>
            <p className="text-sm text-muted-foreground">Expense voucher</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm font-semibold">
              {expense.expense_number}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {expense.business_date}
            </p>
          </div>
        </div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <Detail label="Category" value={expense.categoryName} />
          <Detail label="Payment method" value={expense.paymentMethodName} />
          <Detail label="Description" value={expense.description} />
          <Detail
            label="External reference"
            value={expense.external_reference ?? "Not recorded"}
          />
        </dl>
        <div className="mt-8 flex items-center justify-between border-t pt-5">
          <span className="text-base font-semibold">Amount spent</span>
          <Money value={expense.amount.toFixed(2)} />
        </div>
        {expense.status === "reversed" && (
          <div className="mt-6 rounded-lg border border-destructive/30 bg-danger-soft p-4 text-sm text-destructive">
            <p className="font-semibold">VOIDED</p>
            <p className="mt-1">{expense.reversal_reason}</p>
          </div>
        )}
        <p className="mt-8 border-t pt-4 text-xs text-muted-foreground">
          This voucher reflects the recorded expense and remains available for
          audit history.
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
