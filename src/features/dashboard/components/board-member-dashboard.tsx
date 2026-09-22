import Link from "next/link";
import {
  ArrowUpFromLine,
  ChartNoAxesCombined,
  CircleAlert,
  CircleDollarSign,
  HandCoins,
  ReceiptText,
} from "lucide-react";
import { Money } from "@/components/data-display/money";
import { StatCard } from "@/components/data-display/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { BoardDashboardFilters } from "./board-dashboard-filters";
import { BoardFinancialChartPanel } from "./board-financial-chart-panel";
import type { BoardDashboardData } from "../types";

function FeePositionPanel({ data }: { data: BoardDashboardData }) {
  const expected = Number(data.snapshot.summary.expectedFees);
  const paid = Number(data.snapshot.summary.schoolFeesCollected);
  const outstanding = Number(data.snapshot.summary.outstandingFees);
  const maximum = Math.max(expected, paid, outstanding, 1);
  const rows = [
    {
      label: "Expected",
      value: expected,
      width: (expected / maximum) * 100,
      className: "bg-foreground",
    },
    {
      label: "Paid",
      value: paid,
      width: (paid / maximum) * 100,
      className: "bg-primary",
    },
    {
      label: "Outstanding",
      value: outstanding,
      width: (outstanding / maximum) * 100,
      className: "bg-warning",
    },
  ];

  return (
    <section className="panel min-w-0 p-5 sm:p-6">
      <div>
        <h2 className="text-base font-semibold">Fee position</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {data.periodLabel} · issued school fees
        </p>
      </div>
      <div
        className="mt-8 space-y-6"
        role="img"
        aria-label="Comparison of expected, paid and outstanding school fees. Exact figures follow each bar."
      >
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-2 flex items-center justify-between gap-4 text-sm">
              <span className="font-medium">{row.label}</span>
              <Money value={row.value.toFixed(2)} />
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${row.className}`}
                style={{ width: `${row.width}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-8 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
        Paid and outstanding amounts reflect active student invoices in the
        selected academic scope.
      </p>
    </section>
  );
}

export function BoardMemberDashboard({ data }: { data: BoardDashboardData }) {
  const summary = data.snapshot.summary;

  return (
    <>
      <PageHeader
        title="Board oversight"
        description="Read-only school revenue, expense and fee performance across the selected reporting scope."
      >
        <Button variant="outline" asChild>
          <Link href="/reports">Open reports</Link>
        </Button>
      </PageHeader>

      <BoardDashboardFilters filters={data.filters} options={data.options} />

      <section
        className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        aria-label="Board financial summary"
      >
        <StatCard
          label="School revenue"
          amount={summary.grossReceipts}
          note="Fees, feeding, admission and other active income"
          icon={CircleDollarSign}
          tone="brand"
        />
        <StatCard
          label="Expenses"
          amount={summary.totalExpenses}
          note="All active school expenses"
          icon={ArrowUpFromLine}
          tone="warning"
        />
        <StatCard
          label="Fees expected"
          amount={summary.expectedFees}
          note="Valid student invoices issued"
          icon={ReceiptText}
          tone="brand"
        />
        <StatCard
          label="Net revenue"
          amount={summary.operatingNet}
          note="School revenue less active expenses"
          icon={ChartNoAxesCombined}
          tone="success"
        />
        <StatCard
          label="Fees outstanding"
          amount={summary.outstandingFees}
          note="Current unpaid invoice balances"
          icon={CircleAlert}
          tone="warning"
        />
        <StatCard
          label="Fees paid"
          amount={summary.schoolFeesCollected}
          note="Active school-fee payments"
          icon={HandCoins}
          tone="success"
        />
      </section>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <BoardFinancialChartPanel data={data} />
        <FeePositionPanel data={data} />
      </div>
    </>
  );
}
