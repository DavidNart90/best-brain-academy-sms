import {
  CircleAlert,
  GraduationCap,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { DataTablePagination } from "@/components/data-display/data-table-pagination";
import { PageState } from "@/components/data-display/page-state";
import { StatCard } from "@/components/data-display/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { OutstandingFeesTable } from "@/features/finance/components/outstanding-fees-table";
import type { AdministratorDashboardData } from "../types";

function ClassEnrollmentPanel({ data }: { data: AdministratorDashboardData }) {
  const largestClass = Math.max(
    ...data.classEnrollment.map((item) => item.studentCount),
    1,
  );

  return (
    <section className="panel min-w-0 p-5 sm:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Students by class</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Active enrollment · {data.currentTermLabel}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/classes">Open classes</Link>
        </Button>
      </div>
      {data.classEnrollment.length ? (
        <div className="space-y-4">
          {data.classEnrollment.slice(0, 9).map((item) => (
            <div key={item.classId}>
              <div className="mb-1.5 flex items-center justify-between gap-4 text-sm">
                <Link
                  href={`/students?classId=${item.classId}`}
                  className="truncate font-medium hover:text-primary hover:underline"
                >
                  {item.className}
                </Link>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {item.studentCount}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${Math.max((item.studentCount / largestClass) * 100, 4)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <PageState
          title="No active enrollments"
          description="Active students will appear here once they are assigned to classes."
        />
      )}
    </section>
  );
}

function AdministratorOutstandingPanel({
  data,
}: {
  data: AdministratorDashboardData;
}) {
  const pageCount = Math.max(
    1,
    Math.ceil(data.openBalances / data.outstandingPageSize),
  );
  return (
    <section className="panel min-w-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b p-5 sm:p-6">
        <div>
          <h2 className="text-base font-semibold">Outstanding fee balances</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Highest balances for {data.currentTermLabel}; view and print only
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/financials/outstanding">Filter and print</Link>
        </Button>
      </div>
      {data.outstandingRows.length ? (
        <OutstandingFeesTable rows={data.outstandingRows} canOpenStudents />
      ) : (
        <div className="p-5 sm:p-6">
          <PageState
            title="No outstanding balances"
            description="There are no unpaid student invoices in the current academic term."
          />
        </div>
      )}
      <DataTablePagination
        page={data.outstandingPage}
        pageCount={pageCount}
        total={data.openBalances}
        pageSize={data.outstandingPageSize}
        itemLabel="open balances"
        hrefForPage={(page) =>
          page > 1 ? `/dashboard?feePage=${page}` : "/dashboard"
        }
      />
    </section>
  );
}

export function AdministratorDashboard({
  data,
}: {
  data: AdministratorDashboardData;
}) {
  return (
    <>
      <PageHeader
        title="Administrator dashboard"
        description="Student onboarding, staffing and fee follow-up for the current term."
      >
        <Button asChild>
          <Link href="/admissions/new">New admission</Link>
        </Button>
      </PageHeader>
      <div className="mb-6 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(330px,1fr)] 2xl:grid-cols-[minmax(0,1.9fr)_minmax(390px,1fr)]">
        <ClassEnrollmentPanel data={data} />
        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
          <StatCard
            label="Active students"
            amount={String(data.activeStudents)}
            note="Currently enrolled"
            icon={GraduationCap}
            format="number"
            accent
          />
          <StatCard
            label="New admissions"
            amount={String(data.admissionsThisTerm)}
            note="Admitted this term"
            icon={UserRoundPlus}
            format="number"
          />
          <StatCard
            label="Teaching staff"
            amount={String(data.teachingStaff)}
            note={`${data.activeStaff} active staff overall`}
            icon={UsersRound}
            format="number"
          />
          <StatCard
            label="Open balances"
            amount={String(data.openBalances)}
            note="View and print only"
            icon={CircleAlert}
            format="number"
          />
        </div>
      </div>
      <AdministratorOutstandingPanel data={data} />
    </>
  );
}
