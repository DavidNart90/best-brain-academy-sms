import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CircleAlert,
  CircleDollarSign,
  HandCoins,
} from "lucide-react";
import { Money } from "@/components/data-display/money";
import { StatCard } from "@/components/data-display/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  FinancialBreakdown,
  FinancialPeriodSummary,
  FinancialSnapshot,
} from "../types";

export function FinancialSummaryReport({
  snapshot,
  periodLabel,
  periodSummary,
}: {
  snapshot: FinancialSnapshot;
  periodLabel: string;
  periodSummary: FinancialPeriodSummary;
}) {
  return (
    <div className="report-document space-y-5">
      <section className="hidden print:block">
        <p className="text-sm font-semibold uppercase tracking-wide">
          Best Brain Academy
        </p>
        <h1 className="mt-2 text-xl font-bold">Financial summary</h1>
        <p className="mt-1 text-sm text-muted-foreground">{periodLabel}</p>
      </section>
      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Financial summary"
      >
        <StatCard
          label="Expected fees"
          amount={snapshot.summary.expectedFees}
          note="Valid invoices issued"
          icon={CircleDollarSign}
        />
        <StatCard
          label="Fees collected"
          amount={snapshot.summary.schoolFeesCollected}
          note="Active school-fee payments"
          icon={HandCoins}
          accent
        />
        <StatCard
          label="Outstanding fees"
          amount={snapshot.summary.outstandingFees}
          note="Current invoice balances"
          icon={CircleAlert}
        />
        <StatCard
          label="Total expenses"
          amount={snapshot.summary.totalExpenses}
          note="Active expenses in period"
          icon={ArrowUpFromLine}
        />
      </section>

      <PeriodTable summary={periodSummary} />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <div className="panel overflow-hidden">
          <div className="border-b p-5 sm:px-6">
            <h2 className="text-base font-semibold">
              Revenue and expense reconciliation
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{periodLabel}</p>
          </div>
          <dl className="divide-y">
            <LedgerRow
              label="School-fee collections"
              value={snapshot.summary.schoolFeesCollected}
            />
            <LedgerRow
              label="Feeding collections"
              value={snapshot.summary.feedingCollected}
            />
            <LedgerRow
              label="Admission collections"
              value={snapshot.summary.admissionCollected}
            />
            <LedgerRow
              label="Miscellaneous collections"
              value={snapshot.summary.miscellaneousCollected}
            />
            <LedgerRow
              label="Gross receipts"
              value={snapshot.summary.grossReceipts}
              strong
            />
            <LedgerRow
              label="Less: expenses"
              value={snapshot.summary.totalExpenses}
            />
            <LedgerRow
              label="Operating net"
              value={snapshot.summary.operatingNet}
              strong
            />
            <LedgerRow
              label="Less: salary deductions"
              value={snapshot.summary.salaryDeductions}
            />
            <LedgerRow
              label="Final position"
              value={snapshot.summary.finalPosition}
              strong
              accent
            />
          </dl>
        </div>
        <div className="space-y-5">
          <Breakdown
            title="Collections by source"
            rows={snapshot.incomeBreakdown}
            icon="income"
          />
          <Breakdown
            title="Collections by class"
            rows={snapshot.classCollections}
            icon="income"
          />
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <Breakdown
          title="Expenses by category"
          rows={snapshot.expenseBreakdown}
          icon="expense"
        />
        <Breakdown
          title="Deductions by type"
          rows={snapshot.deductionBreakdown}
          icon="expense"
        />
        <Breakdown
          title="Reversed activity"
          rows={snapshot.reversals}
          icon="reversal"
        />
      </section>
    </div>
  );
}

function PeriodTable({ summary }: { summary: FinancialPeriodSummary }) {
  return (
    <section className="panel min-w-0 overflow-hidden">
      <div className="border-b px-5 py-4 sm:px-6">
        <h2 className="text-base font-semibold">{summary.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {summary.description} Net is revenue less recorded expenses; salary
          deductions remain separate below.
        </p>
      </div>
      <div
        className="table-scroll"
        tabIndex={0}
        aria-label={`${summary.title} table`}
      >
        <Table>
          <caption className="sr-only">{summary.description}</caption>
          <TableHeader>
            <TableRow className="bg-muted/60">
              <TableHead className="pl-6">Period</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Expenses</TableHead>
              <TableHead className="pr-6 text-right">Net</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summary.rows.map((row) => (
              <TableRow key={`${row.label}-${row.start}`}>
                <TableCell className="pl-6 font-medium">{row.label}</TableCell>
                <TableCell>
                  <time dateTime={row.start}>{row.start}</time>
                </TableCell>
                <TableCell>
                  <time dateTime={row.end}>{row.end}</time>
                </TableCell>
                <TableCell className="text-right">
                  <Money value={row.revenue} />
                </TableCell>
                <TableCell className="text-right">
                  <Money value={row.expenses} />
                </TableCell>
                <TableCell className="pr-6 text-right font-medium">
                  <Money value={row.net} />
                </TableCell>
              </TableRow>
            ))}
            {summary.rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-28 text-center">
                  No configured periods are available for this selection.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="pl-6" colSpan={3}>
                Total
              </TableCell>
              <TableCell className="text-right">
                <Money value={summary.total.revenue} />
              </TableCell>
              <TableCell className="text-right">
                <Money value={summary.total.expenses} />
              </TableCell>
              <TableCell className="pr-6 text-right">
                <Money value={summary.total.net} />
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </section>
  );
}

function LedgerRow({
  label,
  value,
  strong = false,
  accent = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 px-5 py-3.5 sm:px-6 ${
        accent ? "bg-brand-subtle" : ""
      }`}
    >
      <dt
        className={strong ? "font-semibold" : "text-sm text-muted-foreground"}
      >
        {label}
      </dt>
      <dd className={strong ? "font-semibold" : "text-sm"}>
        <Money value={value} />
      </dd>
    </div>
  );
}

function Breakdown({
  title,
  rows,
  icon,
}: {
  title: string;
  rows: FinancialBreakdown[];
  icon: "income" | "expense" | "reversal";
}) {
  const Icon =
    icon === "income"
      ? ArrowDownToLine
      : icon === "expense"
        ? ArrowUpFromLine
        : CircleAlert;
  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center gap-2 border-b px-5 py-4">
        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <dl className="divide-y">
        {rows.slice(0, 10).map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
          >
            <div className="min-w-0">
              <dt className="truncate">{row.label}</dt>
              <dd className="mt-0.5 text-xs text-muted-foreground">
                {row.count} {row.count === 1 ? "record" : "records"}
              </dd>
            </div>
            <dd className="shrink-0 font-medium">
              <Money value={row.amount} />
            </dd>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            No activity
          </div>
        )}
      </dl>
    </section>
  );
}
