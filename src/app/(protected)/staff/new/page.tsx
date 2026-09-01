import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PermissionDenied } from "@/components/data-display/page-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { StaffForm } from "@/features/staff/components/staff-form";
import { getStaffReferenceData } from "@/features/staff/server/queries";
import { requirePermission } from "@/lib/auth/access";

export default async function NewStaffPage() {
  if (!(await requirePermission("staff.manage"))) return <PermissionDenied />;
  const reference = await getStaffReferenceData();
  return (
    <>
      <PageHeader
        title="Add staff member"
        description="Create an employment profile and an optional first class assignment. No login account is created."
      >
        <Button asChild variant="outline">
          <Link href="/staff">
            <ArrowLeft /> Staff directory
          </Link>
        </Button>
      </PageHeader>
      <StaffForm reference={reference} />
    </>
  );
}
