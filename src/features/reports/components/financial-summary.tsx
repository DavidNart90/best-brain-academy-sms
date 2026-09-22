import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CircleAlert,
  CircleDollarSign,
} from "lucide-react";
import {
  InMemoryTablePagination,
  PaginatedRows,
} from "@/components/data-display/in-memory-table-pagination";
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
import { cn } from "@/lib/utils";
import { ReportPrintHeader } from "./report-print-header";
import type {
  FinancialBreakdown,
  FinancialPeriodSummary,
  FinancialSnapshot,
  ReportIdentity,
} from "../types";

export function FinancialSummaryReport({
  snapshot,
  periodLabel,
  periodSummary,
  identity,
}: {
  snapshot: FinancialSnapshot;
  periodLabel: string;
  periodSummary: FinancialPeriodSummary;
  identity: ReportIdentity;
}) {
  return (
    <div className="report-document space-y-5">
      <ReportPrintHeader
        identity={identity}
        title="Financial summary"
        periodLabel={periodLabel}
      />
      <section
        className="grid gap-4 md:grid-cols-3"
        aria-label="Financial summary"
      >
        <StatCard
          label="Revenue"
          amount={snapshot.summary.grossReceipts}
          note="All active income received"
          icon={ArrowDownToLine}
          tone="brand"
        />
        <StatCard
          label="Expenses"
          amount={snapshot.summary.totalExpenses}
          note="Operating costs, salaries and remittances"
          icon={ArrowUpFromLine}
          tone="warning"
        />
        <StatCard
          label="Net"
          amount={snapshot.summary.operatingNet}
          note="Revenue less recorded cash expenses"
          icon={CircleDollarSign}
          tone="success"
        />
      </section>

      <FeePosition snapshot={snapshot} />

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
              label="Total revenue"
              value={snapshot.summary.grossReceipts}
              strong
            />
            <LedgerRow
              label="Less: operating expenses"
              value={snapshot.summary.otherExpenses}
            />
            <LedgerRow
              label="Less: net salaries paid"
              value={snapshot.summary.salaryPayments}
            />
            <LedgerRow
              label="Less: SSNIT remitted"
              value={snapshot.summary.ssnitRemittances}
            />
            <LedgerRow
              label="Total expenses"
              value={snapshot.summary.totalExpenses}
              strong
            />
            <LedgerRow
              label="Net"
              value={snapshot.summary.operatingNet}
              strong
              accent
            />
          </dl>
          <p className="border-t px-5 py-3 text-xs leading-5 text-muted-foreground sm:px-6">
            Salary payments and SSNIT remittances are expenses only when cash is
            recorded. This keeps posted payroll calculations separate from
            actual cash movement.
          </p>
        </div>
        <div className="space-y-5">
          <PayrollLiability snapshot={snapshot} />
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

      <section className="grid gap-5 print:grid-cols-2 lg:grid-cols-3">
        <Breakdown
          title="Expenses by category"
          rows={snapshot.expenseBreakdown}
          icon="expense"
        />
        <Breakdown
          title="Payroll liabilities by type"
          rows={snapshot.deductionBreakdown}
          icon="expense"
        />
        <Breakdown
          title="Reversed activity"
          rows={snapshot.reversals}
          icon="reversal"
          className="print:hidden"
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
          {summary.description} Net is revenue less recorded expenses; payroll
          expenses include salary payments and SSNIT remittances recorded in
          cash.
        </p>
      </div>
      <InMemoryTablePagination
        total={summary.rows.length}
        pageSize={10}
        itemLabel="periods"
      >
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
              <PaginatedRows printAll>
                {summary.rows.map((row) => (
                  <TableRow key={`${row.label}-${row.start}`}>
                    <TableCell className="pl-6 font-medium">
                      {row.label}
                    </TableCell>
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
              </PaginatedRows>
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
      </InMemoryTablePagination>
    </section>
  );
}

function FeePosition({ snapshot }: { snapshot: FinancialSnapshot }) {
  const rows = [
    { label: "Expected school fees", value: snapshot.summary.expectedFees },
    {
      label: "Collected in report period",
      value: snapshot.summary.schoolFeesCollected,
    },
    {
      label: "Outstanding school fees",
      value: snapshot.summary.outstandingFees,
    },
  ];
  return (
    <section
      className="panel overflow-hidden"
      aria-labelledby="fee-position-title"
    >
      <div className="border-b px-5 py-4 sm:px-6">
        <h2 id="fee-position-title" className="text-sm font-semibold">
          School-fee position
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Expected and outstanding amounts follow the academic term; collections
          remain limited to the report dates.
        </p>
      </div>
      <dl className="grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {rows.map((row) => (
          <div key={row.label} className="px-5 py-4 sm:px-6">
            <dt className="text-xs text-muted-foreground">{row.label}</dt>
            <dd className="mt-1 font-semibold">
              <Money value={row.value} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function PayrollLiability({ snapshot }: { snapshot: FinancialSnapshot }) {
  return (
    <section
      className="panel overflow-hidden"
      aria-labelledby="ssnit-liability-title"
    >
      <div className="border-b px-5 py-4">
        <h2 id="ssnit-liability-title" className="text-sm font-semibold">
          SSNIT liability
        </h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          SSNIT is withheld when net salary is calculated. Paying the employee
          settles net salary only; the withheld amount remains due until it is
          remitted to SSNIT.
        </p>
      </div>
      <dl className="divide-y">
        <LedgerRow
          label="Employee contribution withheld"
          value={snapshot.summary.ssnitWithheld}
        />
        <LedgerRow
          label="Remitted to SSNIT"
          value={snapshot.summary.ssnitRemittedToDate}
        />
        <LedgerRow
          label="Awaiting remittance"
          value={snapshot.summary.ssnitOutstanding}
          strong
          warning
        />
      </dl>
    </section>
  );
}

function LedgerRow({
  label,
  value,
  strong = false,
  accent = false,
  warning = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  accent?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 px-5 py-3.5 sm:px-6",
        accent && "bg-brand-subtle",
        warning && "bg-warning-soft",
      )}
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
  className,
}: {
  title: string;
  rows: FinancialBreakdown[];
  icon: "income" | "expense" | "reversal";
  className?: string;
}) {
  const Icon =
    icon === "income"
      ? ArrowDownToLine
      : icon === "expense"
        ? ArrowUpFromLine
        : CircleAlert;
  return (
    <section className={cn("panel overflow-hidden", className)}>
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
