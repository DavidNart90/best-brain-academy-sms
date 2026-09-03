import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Settings2 } from "lucide-react";
import { PermissionDenied } from "@/components/data-display/page-state";
import { StatusBadge } from "@/components/data-display/status-badge";
import { Button } from "@/components/ui/button";
import { getSchoolClass } from "@/features/academics/server/queries";
import { classGroupLabels } from "@/features/academics/types";
import { requirePermission } from "@/lib/auth/access";
import { hasPermission } from "@/lib/permissions/contracts";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function ClassDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const context = await requirePermission("classes.read");
  if (!context) return <PermissionDenied />;
  const classId = Number((await params).id);
  if (!Number.isInteger(classId) || classId < 1) notFound();
  const schoolClass = await getSchoolClass(classId);
  if (!schoolClass) notFound();

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link href="/classes">
          <ArrowLeft /> Back to classes
        </Link>
      </Button>

      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                {schoolClass.name}
              </h1>
              <StatusBadge
                status={schoolClass.status === "active" ? "Active" : "Archived"}
              />
            </div>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              {schoolClass.code}
            </p>
          </div>
          {hasPermission(context, "settings.manage") && (
            <Button asChild>
              <Link href="/settings/academics">
                <Settings2 /> Manage class
              </Link>
            </Button>
          )}
        </div>
        <dl className="grid border-t sm:grid-cols-2 lg:grid-cols-4">
          <ClassDetail
            label="Class group"
            value={
              classGroupLabels[schoolClass.class_group] ??
              schoolClass.class_group
            }
          />
          <ClassDetail
            label="Display order"
            value={String(schoolClass.sort_order)}
          />
          <ClassDetail
            label="Created"
            value={dateFormatter.format(new Date(schoolClass.created_at))}
          />
          <ClassDetail
            label="Last updated"
            value={dateFormatter.format(new Date(schoolClass.updated_at))}
          />
        </dl>
      </section>
    </div>
  );
}

function ClassDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b p-5 last:border-b-0 sm:border-r sm:even:border-r-0 lg:border-b-0 lg:even:border-r lg:last:border-r-0">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-semibold">{value}</dd>
    </div>
  );
}
