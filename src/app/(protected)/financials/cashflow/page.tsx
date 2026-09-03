import Link from "next/link";
import { ArrowRight, CalendarDays, ReceiptText, Settings2 } from "lucide-react";
import { Money } from "@/components/data-display/money";
import {
  PageState,
  PermissionDenied,
} from "@/components/data-display/page-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { CashflowEntryForm } from "@/features/finance/components/cashflow-entry-form";
import {
  getCashflowFormOptions,
  getDailyCashflow,
} from "@/features/finance/server/queries";
import { requirePermission } from "@/lib/auth/access";
import { hasPermission } from "@/lib/permissions/contracts";

const dateSchema = /^\d{4}-\d{2}-\d{2}$/;
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-GB", { dateStyle: "full" }).format(
    new Date(`${value}T00:00:00Z`),
  );

export default async function CashflowPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requirePermission("financials.read");
  if (!context) return <PermissionDenied />;
  const rawDate = (await searchParams).date;
  const requestedDate = Array.isArray(rawDate) ? rawDate[0] : rawDate;
  const businessDate =
    requestedDate && dateSchema.test(requestedDate)
      ? requestedDate
      : new Date().toISOString().slice(0, 10);
  const cashflow = await getDailyCashflow(businessDate);
  const entryOptions = hasPermission(context, "finance.transactions.manage")
    ? await getCashflowFormOptions()
    : null;

  return (
    <>
      <PageHeader
        title="Daily cashflow"
        description="Review posted money received and money spent for one business date. Invoices are charges, not cash received."
      >
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/financials/invoices">
              <ReceiptText /> Invoices
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/settings/financials">
              <Settings2 /> Finance settings
            </Link>
          </Button>
        </div>
      </PageHeader>

      <div className="space-y-5">
        {entryOptions && (
          <CashflowEntryForm
            options={entryOptions}
            businessDate={businessDate}
          />
        )}
        <section className="panel p-5" aria-labelledby="cashflow-date-title">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Business date
              </p>
              <h2
                id="cashflow-date-title"
                className="mt-1 text-lg font-semibold"
              >
                {formatDate(businessDate)}
              </h2>
            </div>
            <form className="flex items-end gap-2" method="get">
              <div>
                <label htmlFor="business-date" className="sr-only">
                  Select business date
                </label>
                <input
                  id="business-date"
                  name="date"
                  type="date"
                  defaultValue={businessDate}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
              </div>
              <Button type="submit" variant="outline">
                <CalendarDays /> View date
              </Button>
            </form>
          </div>
        </section>

        <section
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Daily cashflow totals"
        >
          <SummaryCard
            label="Gross receipts"
            value={cashflow.grossReceipts}
            tone="positive"
          />
          <SummaryCard
            label="Expenses"
            value={cashflow.expenses}
            tone="neutral"
          />
          <SummaryCard
            label="Net cashflow"
            value={cashflow.netCashflow}
            tone="primary"
          />
          <SummaryCard
            label="Posted entries"
            value={String(cashflow.entryCount)}
            tone="neutral"
            isCount
          />
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="panel overflow-hidden">
            <div className="border-b p-5">
              <h2 className="text-base font-semibold">Money received</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Only active, posted receipts and payments are included.
              </p>
            </div>
            <div className="divide-y">
              <CashflowRow
                label="School-fee collections"
                value={cashflow.schoolFees}
                count={cashflow.schoolFeeCount}
              />
              <CashflowRow
                label="Feeding collections"
                value={cashflow.feeding}
                count={cashflow.feedingCount}
              />
              <CashflowRow
                label="Admission collections"
                value={cashflow.admission}
                count={cashflow.admissionCount}
              />
              <CashflowRow
                label="Miscellaneous collections"
                value={cashflow.miscellaneous}
                count={cashflow.miscellaneousCount}
              />
            </div>
            <div className="flex items-center justify-between bg-brand-subtle/50 px-5 py-4 text-sm font-semibold">
              <span>Gross receipts</span>
              <Money value={cashflow.grossReceipts} />
            </div>
          </div>

          <div className="panel overflow-hidden">
            <div className="border-b p-5">
              <h2 className="text-base font-semibold">Money spent</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Expenses remain separate from income and are shown at their
                positive posted amount.
              </p>
            </div>
            <div className="flex items-center justify-between border-b px-5 py-5">
              <div>
                <p className="text-sm font-medium">Posted expenses</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {cashflow.expenseCount} entr
                  {cashflow.expenseCount === 1 ? "y" : "ies"}
                </p>
              </div>
              <Money value={cashflow.expenses} />
            </div>
            <div className="flex items-center justify-between bg-muted/35 px-5 py-4 text-sm font-semibold">
              <span>Net cashflow</span>
              <Money value={cashflow.netCashflow} />
            </div>
          </div>
        </section>

        {cashflow.entryCount === 0 && (
          <PageState
            kind="empty"
            title="No posted cashflow entries"
            description="There are no active receipts or expenses recorded for this business date. Entry controls will appear here when the daily posting workflow is enabled."
          >
            <Button asChild variant="outline" className="mt-2">
              <Link href="/financials/invoices">
                Review invoices <ArrowRight />
              </Link>
            </Button>
          </PageState>
        )}
      </div>
    </>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  isCount = false,
}: {
  label: string;
  value: string;
  tone: "positive" | "neutral" | "primary";
  isCount?: boolean;
}) {
  const toneClass =
    tone === "positive"
      ? "border-success/25 bg-success-soft/45"
      : tone === "primary"
        ? "border-primary/20 bg-brand-subtle/60"
        : "border-border bg-card";
  return (
    <div className={`rounded-xl border p-5 ${toneClass}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-3 text-2xl font-semibold tabular-nums">
        {isCount ? value : <Money value={value} />}
      </p>
    </div>
  );
}

function CashflowRow({
  label,
  value,
  count,
}: {
  label: string;
  value: string;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {count} posted {count === 1 ? "entry" : "entries"}
        </p>
      </div>
      <Money value={value} />
    </div>
  );
}
