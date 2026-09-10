import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { PermissionDenied } from "@/components/data-display/page-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { FinancialSummaryReport } from "@/features/reports/components/financial-summary";
import { LibraryFinancialSummary } from "@/features/library/components/library-financial-summary";
import { getLibraryFinancialSummary } from "@/features/library/server/queries";
import { buildFinancialPeriodSummary } from "@/features/reports/period-summary";
import {
  getFinancialSnapshot,
  getReportingOptions,
  resolveReportFilters,
} from "@/features/reports/server/queries";
import { requirePermission } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export default async function FinancialOverviewPage() {
  const context = await requirePermission("financials.read");
  if (!context) return <PermissionDenied />;
  const options = await getReportingOptions();
  const filters = resolveReportFilters({ view: "financial-summary" }, options);
  const selectedTerm = options.academicTerms.find(
    (term) => term.id === filters.academicTermId,
  );
  const [snapshot, librarySummary] = await Promise.all([
    getFinancialSnapshot(filters),
    getLibraryFinancialSummary(filters.academicTermId ?? selectedTerm?.id ?? 0),
  ]);
  const periodLabel = `${selectedTerm?.name ?? "Current period"} · ${filters.start} to ${filters.end}`;
  const periodSummary = buildFinancialPeriodSummary(
    snapshot.daily,
    filters,
    options,
  );

  return (
    <>
      <PageHeader
        title="Financial overview"
        description="Billed fees, active collections, expenses, deductions, and current balances."
      >
        <Button variant="outline" asChild>
          <Link href="/reports?view=financial-summary">
            <BarChart3 /> Open detailed reports
          </Link>
        </Button>
      </PageHeader>
      <div className="space-y-5">
        <FinancialSummaryReport
          snapshot={snapshot}
          periodLabel={periodLabel}
          periodSummary={periodSummary}
        />
        <LibraryFinancialSummary
          summary={librarySummary}
          periodLabel={selectedTerm?.name ?? "Selected term"}
        />
      </div>
    </>
  );
}
