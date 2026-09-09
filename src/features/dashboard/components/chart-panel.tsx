"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Money } from "@/components/data-display/money";
import type { FinancialTrendPoint } from "@/features/reports/types";

const CollectionChart = dynamic(() => import("./collection-chart"), {
  ssr: false,
  loading: () => <Skeleton className="h-[248px] w-full" />,
});

const monthAndYear = new Intl.DateTimeFormat("en-GH", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function ChartPanel({
  trend,
  periodLabel,
}: {
  trend: FinancialTrendPoint[];
  periodLabel: string;
}) {
  return (
    <section className="panel min-w-0 p-5 sm:p-6">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Gross collections</h2>
          <p className="mt-1 text-xs text-muted-foreground">{periodLabel}</p>
        </div>
        <span className="pt-1 text-xs text-muted-foreground">GHS</span>
      </div>
      <CollectionChart data={trend} />
      <details className="mt-3 text-xs text-muted-foreground">
        <summary className="w-fit rounded py-2">View chart figures</summary>
        <dl className="grid grid-cols-2 gap-3 py-3 sm:grid-cols-4">
          {trend.map((point) => (
            <div key={point.periodStart}>
              <dt>
                {monthAndYear.format(
                  new Date(`${point.periodStart}T00:00:00Z`),
                )}
              </dt>
              <dd className="mt-1 text-foreground">
                <Money value={point.grossReceipts.toFixed(2)} />
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </section>
  );
}
