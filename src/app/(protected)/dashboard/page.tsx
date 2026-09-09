import { requirePermission } from "@/lib/auth/access";
import { hasPermission } from "@/lib/permissions/contracts";
import { Dashboard } from "@/features/dashboard/components/dashboard";
import { PermissionDenied } from "@/components/data-display/page-state";
import {
  getFinancialSnapshot,
  getReportTable,
  getReportingOptions,
  resolveReportFilters,
} from "@/features/reports/server/queries";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requirePermission("dashboard.read");
  if (!context) return <PermissionDenied />;
  const showFinancials = hasPermission(context, "financials.read");
  if (!showFinancials)
    return (
      <Dashboard
        showFinancials={false}
        snapshot={null}
        periodLabel="Current reporting period"
        outstanding={null}
        classes={[]}
      />
    );
  const options = await getReportingOptions();
  const raw = await searchParams;
  const filters = resolveReportFilters(
    { view: "outstanding", classId: raw.classId },
    options,
  );
  const [snapshot, outstanding] = await Promise.all([
    getFinancialSnapshot(filters),
    getReportTable(filters, 10),
  ]);
  const selectedTerm = options.academicTerms.find(
    (term) => term.id === filters.academicTermId,
  );
  return (
    <Dashboard
      showFinancials
      snapshot={snapshot}
      outstanding={outstanding}
      classes={options.classes}
      classId={filters.classId}
      periodLabel={`${selectedTerm?.name ?? "Current period"} · ${filters.start} to ${filters.end}`}
    />
  );
}
