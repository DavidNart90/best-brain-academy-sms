import { redirect } from "next/navigation";
import { PermissionDenied } from "@/components/data-display/page-state";
import { requirePermission } from "@/lib/auth/access";
import { hasPermission } from "@/lib/permissions/contracts";

export default async function AdmissionRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const context = await requirePermission("admissions.read");
  if (!context || !hasPermission(context, "students.read"))
    return <PermissionDenied />;

  const { id } = await params;
  redirect(`/students/${id}`);
}
