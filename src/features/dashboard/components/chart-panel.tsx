"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Money } from "@/components/data-display/money";
import { demoTrend } from "../demo-data";

const CollectionChart = dynamic(() => import("./collection-chart"), {
  ssr: false,
  loading: () => <Skeleton className="h-[248px] w-full" />,
});

export function ChartPanel() {
  return (
    <section className="panel min-w-0 p-5 sm:p-6">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Fees Collection</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Jan – Aug 2026 · Synthetic data
          </p>
        </div>
        <span className="pt-1 text-xs text-muted-foreground">GHS</span>
      </div>
      <CollectionChart />
      <details className="mt-3 text-xs text-muted-foreground">
        <summary className="w-fit rounded py-2">View chart figures</summary>
        <dl className="grid grid-cols-2 gap-3 py-3 sm:grid-cols-4">
          {demoTrend.map((point) => (
            <div key={point.month}>
              <dt>{point.month}</dt>
              <dd className="mt-1 text-foreground">
                <Money value={point.amount.toFixed(2)} />
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </section>
  );
}
