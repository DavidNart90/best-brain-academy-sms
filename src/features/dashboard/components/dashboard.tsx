import {
  CircleDollarSign,
  HandCoins,
  CircleAlert,
  ArrowUpFromLine,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/data-display/stat-card";
import { PageState } from "@/components/data-display/page-state";
import { Button } from "@/components/ui/button";
import { ChartPanel } from "./chart-panel";
import { OutstandingFeesTable } from "./outstanding-fees-table";
import type { FinancialSnapshot, ReportTable } from "@/features/reports/types";

export function Dashboard({
  showFinancials,
  snapshot,
  periodLabel,
  outstanding,
  classes,
  classId,
}: {
  showFinancials: boolean;
  snapshot: FinancialSnapshot | null;
  periodLabel: string;
  outstanding: ReportTable | null;
  classes: Array<{ id: number; name: string }>;
  classId?: number;
}) {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Reconciled school finance activity and outstanding fee balances."
      >
        <Button variant="outline" asChild>
          <Link href="/reports">Open reports</Link>
        </Button>
      </PageHeader>
      {showFinancials && snapshot && outstanding ? (
        <>
          <div className="mb-6 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(330px,1fr)] 2xl:grid-cols-[minmax(0,1.9fr)_minmax(390px,1fr)]">
            <ChartPanel trend={snapshot.monthly} periodLabel={periodLabel} />
            <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
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
            </div>
          </div>
          <OutstandingFeesTable
            table={outstanding}
            classes={classes}
            classId={classId}
          />
        </>
      ) : (
        <PageState
          title="Your workspace is ready"
          description="Use the sidebar to open the pages available to your account. Financial dashboard figures require financial visibility."
        />
      )}
    </>
  );
}
