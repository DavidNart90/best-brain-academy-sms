import {
  PageState,
  PermissionDenied,
} from "@/components/data-display/page-state";
import { PageHeader } from "@/components/layout/page-header";
import { AdministratorDashboard } from "@/features/dashboard/components/administrator-dashboard";
import { BoardMemberDashboard } from "@/features/dashboard/components/board-member-dashboard";
import { FinancialDashboard } from "@/features/dashboard/components/dashboard";
import { FinanceOversightDashboard } from "@/features/dashboard/components/finance-oversight-dashboard";
import { resolveDashboardVariant } from "@/features/dashboard/role";
import {
  getAdministratorDashboardData,
  getBoardDashboardData,
  getFinancialDashboardData,
  getSuperAdminOperationsData,
} from "@/features/dashboard/server/queries";
import { getLibraryFinancialSummary } from "@/features/library/server/queries";
import { requirePermission } from "@/lib/auth/access";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requirePermission("dashboard.read");
  if (!context) return <PermissionDenied />;

  const raw = await searchParams;
  const variant = resolveDashboardVariant(context.roles);

  if (variant === "administrator") {
    const data = await getAdministratorDashboardData(raw);
    return <AdministratorDashboard data={data} />;
  }

  if (variant === "board-member") {
    const data = await getBoardDashboardData(raw);
    return <BoardMemberDashboard data={data} />;
  }

  if (variant === "accountant") {
    const data = await getBoardDashboardData(raw);
    const librarySummary = await getLibraryFinancialSummary(
      data.filters.academicTermId ?? 0,
    );
    return (
      <FinanceOversightDashboard
        data={data}
        librarySummary={librarySummary}
        title="Accountant dashboard"
        description="Daily financial control across revenue, expenses, collections and outstanding balances."
        resetHref="/dashboard"
      />
    );
  }

  if (variant === "super-admin") {
    const [data, operations] = await Promise.all([
      getFinancialDashboardData(raw, true),
      getSuperAdminOperationsData(),
    ]);
    return (
      <FinancialDashboard
        mode="super-admin"
        data={data}
        operations={operations}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Your available school workspaces and daily responsibilities."
      />
      <PageState
        title="Your workspace is ready"
        description="Use the sidebar to open the pages available to your account."
      />
    </>
  );
}
