import { requirePermission } from "@/lib/auth/access";
import { hasPermission } from "@/lib/permissions/contracts";
import { Dashboard } from "@/features/dashboard/components/dashboard";
import { PermissionDenied } from "@/components/data-display/page-state";

export default async function DashboardPage() {
  const context = await requirePermission("dashboard.read");
  if (!context) return <PermissionDenied />;
  return (
    <Dashboard showFinancials={hasPermission(context, "financials.read")} />
  );
}
