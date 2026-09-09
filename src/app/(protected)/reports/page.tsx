import { PageHeader } from "@/components/layout/page-header";
import {
  PageState,
  PermissionDenied,
} from "@/components/data-display/page-state";
import { FinancialSummaryReport } from "@/features/reports/components/financial-summary";
import { ReportActions } from "@/features/reports/components/report-actions";
import { ReportFiltersForm } from "@/features/reports/components/report-filters";
import { ReportTable } from "@/features/reports/components/report-table";
import { getReportPage } from "@/features/reports/server/queries";
import type { ReportAccess } from "@/features/reports/types";
import { requirePermission } from "@/lib/auth/access";
import { hasPermission } from "@/lib/permissions/contracts";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requirePermission("reports.read");
  if (!context) return <PermissionDenied />;
  const access: ReportAccess = {
    financials: hasPermission(context, "financials.read"),
    students: hasPermission(context, "students.read"),
    admissions: hasPermission(context, "admissions.read"),
    staff: hasPermission(context, "staff.read"),
    classes: hasPermission(context, "classes.read"),
  };
  const report = await getReportPage(await searchParams, access);
  const selectedTerm = report.options.academicTerms.find(
    (term) => term.id === report.filters.academicTermId,
  );
  const periodLabel = `${selectedTerm?.name ?? "Selected period"} · ${report.filters.start} to ${report.filters.end}`;

  return (
    <>
      <PageHeader
        title="Reports"
        description="Reconciled financial and administrative records with bounded exports."
      >
        {!report.accessDenied && (report.snapshot || report.table) ? (
          <ReportActions filters={report.filters} />
        ) : null}
      </PageHeader>
      <ReportFiltersForm
        filters={report.filters}
        options={report.options}
        access={access}
      />
      {report.accessDenied ? (
        <PageState
          kind="denied"
          title="This report needs additional access"
          description="Your account can open Reports, but it does not have permission to read the records used by this report."
        />
      ) : report.snapshot && report.periodSummary ? (
        <FinancialSummaryReport
          snapshot={report.snapshot}
          periodLabel={periodLabel}
          periodSummary={report.periodSummary}
        />
      ) : report.table ? (
        <ReportTable table={report.table} filters={report.filters} />
      ) : (
        <PageState
          title="Choose a report"
          description="Select a report and apply the filters to view its records."
        />
      )}
    </>
  );
}
