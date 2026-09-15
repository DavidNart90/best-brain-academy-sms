import { PermissionDenied } from "@/components/data-display/page-state";
import { FinanceOversightDashboard } from "@/features/dashboard/components/finance-oversight-dashboard";
import { getBoardDashboardData } from "@/features/dashboard/server/queries";
import { getLibraryFinancialSummary } from "@/features/library/server/queries";
import { requirePermission } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export default async function FinancialOverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requirePermission("financials.read");
  if (!context) return <PermissionDenied />;
  const data = await getBoardDashboardData(await searchParams);
  const librarySummary = await getLibraryFinancialSummary(
    data.filters.academicTermId ?? 0,
  );
  return (
    <FinanceOversightDashboard data={data} librarySummary={librarySummary} />
  );
}
