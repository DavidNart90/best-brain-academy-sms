import {
  CircleDollarSign,
  HandCoins,
  CircleAlert,
  ArrowUpFromLine,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/data-display/stat-card";
import { Button } from "@/components/ui/button";
import { ChartPanel } from "./chart-panel";
import { OutstandingFeesTable } from "./outstanding-fees-table";
import {
  BoardOversightPanel,
  SuperAdminOperationsPanel,
} from "./dashboard-support-panels";
import type {
  FinancialDashboardData,
  SuperAdminOperationsData,
} from "../types";

const roleContent = {
  accountant: {
    title: "Accountant dashboard",
    description:
      "Reconciled school finance activity and outstanding fee balances.",
  },
  "board-member": {
    title: "Board oversight",
    description: "Read-only financial performance and governance indicators.",
  },
  "super-admin": {
    title: "Super administrator dashboard",
    description:
      "School-wide financial performance, operations and access oversight.",
  },
} as const;

export function FinancialDashboard({
  mode,
  data,
  operations,
}: {
  mode: keyof typeof roleContent;
  data: FinancialDashboardData;
  operations?: SuperAdminOperationsData;
}) {
  const { snapshot, outstanding, classes, classId, periodLabel } = data;
  const content = roleContent[mode];

  return (
    <>
      <PageHeader title={content.title} description={content.description}>
        <Button variant="outline" asChild>
          <Link href="/reports">Open reports</Link>
        </Button>
      </PageHeader>
      <div className="mb-6 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(330px,1fr)] 2xl:grid-cols-[minmax(0,1.9fr)_minmax(390px,1fr)]">
        <ChartPanel trend={snapshot.monthly} periodLabel={periodLabel} />
        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
          <StatCard
            label="Expected fees"
            amount={snapshot.summary.expectedFees}
            note="Valid invoices issued"
            icon={CircleDollarSign}
            tone="brand"
          />
          <StatCard
            label="Fees collected"
            amount={snapshot.summary.schoolFeesCollected}
            note="Active school-fee payments"
            icon={HandCoins}
            tone="success"
          />
          <StatCard
            label="Outstanding fees"
            amount={snapshot.summary.outstandingFees}
            note="Current invoice balances"
            icon={CircleAlert}
            tone="warning"
          />
          <StatCard
            label="Total expenses"
            amount={snapshot.summary.totalExpenses}
            note="Active expenses in period"
            icon={ArrowUpFromLine}
            tone="warning"
          />
        </div>
      </div>
      {mode === "board-member" ? (
        <BoardOversightPanel snapshot={snapshot} />
      ) : outstanding ? (
        <>
          <OutstandingFeesTable
            table={outstanding}
            classes={classes}
            classId={classId}
          />
          {mode === "super-admin" && operations ? (
            <SuperAdminOperationsPanel data={operations} />
          ) : null}
        </>
      ) : (
        <BoardOversightPanel snapshot={snapshot} />
      )}
    </>
  );
}
