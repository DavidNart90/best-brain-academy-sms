"use client";

import dynamic from "next/dynamic";
import { Money } from "@/components/data-display/money";
import { Skeleton } from "@/components/ui/skeleton";
import type { BoardDashboardData } from "../types";

const BoardFinancialTrendChart = dynamic(
  () => import("./board-financial-trend-chart"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[286px] w-full" />,
  },
);

const periodFormatter = new Intl.DateTimeFormat("en-GH", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function BoardFinancialChartPanel({
  data,
  title = "Financial movement",
  description = "all active school income and expenses",
}: {
  data: BoardDashboardData;
  title?: string;
  description?: string;
}) {
  return (
    <section className="panel min-w-0 p-5 sm:p-6">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {data.periodLabel} · {description}
          </p>
        </div>
        <span className="pt-1 text-xs text-muted-foreground">GHS</span>
      </div>
      <BoardFinancialTrendChart
        data={data.trend}
        granularity={data.trendGranularity}
      />
      <details className="mt-3 text-xs text-muted-foreground">
        <summary className="w-fit rounded py-2">View chart figures</summary>
        <dl className="grid gap-3 py-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.trend.map((point) => (
            <div
              key={point.periodStart}
              className="border-l border-border pl-3"
            >
              <dt>
                {periodFormatter.format(
                  new Date(`${point.periodStart}T00:00:00Z`),
                )}
              </dt>
              <dd className="mt-1 text-foreground">
                Revenue <Money value={point.grossReceipts.toFixed(2)} />
              </dd>
              <dd className="mt-1 text-foreground">
                Expenses <Money value={point.expenses.toFixed(2)} />
              </dd>
              <dd className="mt-1 text-foreground">
                Net <Money value={point.operatingNet.toFixed(2)} />
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </section>
  );
}
