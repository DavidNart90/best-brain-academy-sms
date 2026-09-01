import { redirect } from "next/navigation";
import { PermissionDenied } from "@/components/data-display/page-state";
import { requirePermission } from "@/lib/auth/access";

export default async function NewAdmissionPage() {
  const context = await requirePermission("students.manage");
  if (!context) return <PermissionDenied />;
  redirect("/students/new");
}
