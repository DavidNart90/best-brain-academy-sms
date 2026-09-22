import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChartNoAxesCombined,
  CircleAlert,
  CircleDollarSign,
  FileStack,
  HandCoins,
  ReceiptText,
} from "lucide-react";
import {
  InMemoryTablePagination,
  PaginatedRows,
} from "@/components/data-display/in-memory-table-pagination";
import { Money } from "@/components/data-display/money";
import { StatCard } from "@/components/data-display/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LibrarySummary } from "@/features/library/types";
import type { FinancialBreakdown } from "@/features/reports/types";
import type { BoardDashboardData } from "../types";
import { BoardDashboardFilters } from "./board-dashboard-filters";
import { BoardFinancialChartPanel } from "./board-financial-chart-panel";

function BreakdownList({
  title,
  rows,
  kind,
}: {
  title: string;
  rows: FinancialBreakdown[];
  kind: "income" | "expense";
}) {
  const Icon = kind === "income" ? ArrowDownToLine : ArrowUpFromLine;
  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center gap-2 border-b px-5 py-4">
        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <dl className="divide-y">
        {rows.slice(0, 6).map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
          >
            <div className="min-w-0">
              <dt className="truncate font-medium">{row.label}</dt>
              <dd className="mt-0.5 text-xs text-muted-foreground">
                {row.count} {row.count === 1 ? "entry" : "entries"}
              </dd>
            </div>
            <dd className="shrink-0 font-semibold">
              <Money value={row.amount} />
            </dd>
          </div>
        ))}
        {rows.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            No activity in this period
          </div>
        ) : null}
      </dl>
    </section>
  );
}

function FeeControlPanel({
  data,
  librarySummary,
}: {
  data: BoardDashboardData;
  librarySummary: LibrarySummary;
}) {
  const expected = Number(data.snapshot.summary.expectedFees);
  const paid = Number(data.snapshot.summary.schoolFeesCollected);
  const collectionRate =
    expected > 0 ? Math.min((paid / expected) * 100, 100) : 0;

  return (
    <section className="panel p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Fee control</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            School-fee recovery and separate Library exposure
          </p>
        </div>
        <span className="font-mono text-sm font-semibold">
          {collectionRate.toFixed(1)}%
        </span>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${collectionRate}%` }}
          aria-hidden="true"
        />
      </div>
      <p className="sr-only">
        {collectionRate.toFixed(1)}% of issued school fees collected.
      </p>
      <dl className="mt-5 divide-y border-y text-sm">
        <div className="flex justify-between gap-4 py-3">
          <dt className="text-muted-foreground">Fees issued</dt>
          <dd className="font-semibold">
            <Money value={data.snapshot.summary.expectedFees} />
          </dd>
        </div>
        <div className="flex justify-between gap-4 py-3">
          <dt className="text-muted-foreground">Fees collected</dt>
          <dd className="font-semibold">
            <Money value={data.snapshot.summary.schoolFeesCollected} />
          </dd>
        </div>
        <div className="flex justify-between gap-4 py-3">
          <dt className="text-muted-foreground">Fees outstanding</dt>
          <dd className="font-semibold">
            <Money value={data.snapshot.summary.outstandingFees} />
          </dd>
        </div>
        <div className="flex justify-between gap-4 py-3">
          <dt className="text-muted-foreground">Library expected</dt>
          <dd className="font-semibold">
            <Money value={librarySummary.expected} />
          </dd>
        </div>
        <div className="flex justify-between gap-4 py-3">
          <dt className="text-muted-foreground">Library outstanding</dt>
          <dd className="font-semibold">
            <Money value={librarySummary.outstanding} />
          </dd>
        </div>
      </dl>
      <Button asChild variant="outline" className="mt-5 w-full">
        <Link href="/financials/outstanding">
          <CircleAlert /> Review outstanding fees
        </Link>
      </Button>
    </section>
  );
}

export function FinanceOversightDashboard({
  data,
  librarySummary,
  title = "Financial oversight",
  description = "Revenue, spending, collections and outstanding exposure in one reconciled view.",
  resetHref = "/financials",
}: {
  data: BoardDashboardData;
  librarySummary: LibrarySummary;
  title?: string;
  description?: string;
  resetHref?: string;
}) {
  const summary = data.snapshot.summary;

  return (
    <>
      <PageHeader title={title} description={description}>
        <Button variant="outline" asChild>
          <Link href="/reports?view=financial-summary">
            <ChartNoAxesCombined /> Detailed reports
          </Link>
        </Button>
      </PageHeader>

      <BoardDashboardFilters
        filters={data.filters}
        options={data.options}
        label="Finance reporting scope"
        resetHref={resetHref}
      />

      <section
        className="mb-5 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(330px,1fr)]"
        aria-label="Financial position"
      >
        <BoardFinancialChartPanel
          data={data}
          title="Cash movement"
          description="posted receipts against recorded expenses"
        />
        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
          <StatCard
            label="Gross receipts"
            amount={summary.grossReceipts}
            note="All active income received"
            icon={CircleDollarSign}
            tone="brand"
          />
          <StatCard
            label="Expenses"
            amount={summary.totalExpenses}
            note={`${summary.expenseCount} recorded entries`}
            icon={ArrowUpFromLine}
            tone="warning"
          />
          <StatCard
            label="Operating net"
            amount={summary.operatingNet}
            note="Receipts less expenses"
            icon={ChartNoAxesCombined}
            tone="success"
          />
          <StatCard
            label="Cash position"
            amount={summary.finalPosition}
            note="Net after posted salary cash activity"
            icon={HandCoins}
            tone="success"
          />
        </div>
      </section>

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <FeeControlPanel data={data} librarySummary={librarySummary} />
        <BreakdownList
          title="Collections by source"
          rows={data.snapshot.incomeBreakdown}
          kind="income"
        />
        <BreakdownList
          title="Expenses by category"
          rows={data.snapshot.expenseBreakdown}
          kind="expense"
        />
      </div>

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-semibold">Recent collections</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Latest posted receipts in {data.periodLabel}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button asChild variant="outline" size="sm">
              <Link href="/financials/payments">
                <HandCoins /> Payments
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/financials/expenses">
                <ReceiptText /> Expenses
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/financials/end-of-term-invoices">
                <FileStack /> End-of-term invoices
              </Link>
            </Button>
          </div>
        </div>
        <InMemoryTablePagination
          total={data.snapshot.recentCollections.length}
          itemLabel="collections"
        >
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Recent finance collections"
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60 hover:bg-muted/60">
                  <TableHead className="pl-6">Date</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Student / Payer</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="pr-6 text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <PaginatedRows>
                  {data.snapshot.recentCollections.map((row) => (
                    <TableRow key={`${row.source}-${row.reference}`}>
                      <TableCell className="pl-6">{row.businessDate}</TableCell>
                      <TableCell className="font-mono text-xs font-semibold">
                        {row.reference}
                      </TableCell>
                      <TableCell>{row.source}</TableCell>
                      <TableCell>
                        <div className="font-medium">{row.personName}</div>
                        {row.className ? (
                          <div className="text-xs text-muted-foreground">
                            {row.className}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>{row.paymentMethod}</TableCell>
                      <TableCell className="pr-6 text-right font-semibold">
                        <Money value={row.amount} />
                      </TableCell>
                    </TableRow>
                  ))}
                </PaginatedRows>
                {data.snapshot.recentCollections.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-28 text-center text-muted-foreground"
                    >
                      No collections in this reporting scope.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </InMemoryTablePagination>
      </section>
    </>
  );
}
