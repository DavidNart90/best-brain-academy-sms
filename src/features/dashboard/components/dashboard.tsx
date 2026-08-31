import {
  CircleDollarSign,
  HandCoins,
  CircleAlert,
  ArrowUpFromLine,
  Info,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/data-display/stat-card";
import { PageState } from "@/components/data-display/page-state";
import { ChartPanel } from "./chart-panel";
import { CollectionsTable } from "./collections-table";
import { demoMetrics } from "../demo-data";

const icons = [CircleDollarSign, HandCoins, CircleAlert, ArrowUpFromLine];

export function Dashboard({ showFinancials }: { showFinancials: boolean }) {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="A clear view of school administration and finances."
      >
        <span className="rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
          Foundation preview
        </span>
      </PageHeader>
      <div
        role="note"
        className="mb-6 flex items-start gap-3 rounded-lg border border-border bg-brand-subtle px-4 py-3 text-sm"
      >
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>
          <strong className="font-semibold">Demo data only.</strong>
          <span className="text-muted-foreground">
            {" "}
            These figures and records are synthetic. No live school data or
            financial transactions are available.
          </span>
        </p>
      </div>
      {showFinancials ? (
        <>
          <div className="mb-6 grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1.85fr)_minmax(390px,1fr)] xl:grid-cols-[minmax(0,1.65fr)_minmax(360px,1fr)]">
            <ChartPanel />
            <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
              {demoMetrics.map((metric, index) => {
                const Icon = icons[index] ?? CircleDollarSign;
                return (
                  <StatCard
                    key={metric.label}
                    {...metric}
                    icon={Icon}
                    accent={index === 1}
                  />
                );
              })}
            </div>
          </div>
          <CollectionsTable />
        </>
      ) : (
        <PageState
          title="Your workspace is ready"
          description="Use the sidebar to explore the pages available to your account. Financial visibility requires a separate permission; business workflows open in later phases."
        />
      )}
    </>
  );
}
