import Link from "next/link";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  LockKeyhole,
  Mail,
  Phone,
} from "lucide-react";
import { notFound } from "next/navigation";
import { PermissionDenied } from "@/components/data-display/page-state";
import { StatusBadge } from "@/components/data-display/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StaffProfileActions } from "@/features/staff/components/staff-profile-actions";
import { staffIdSchema } from "@/features/staff/schemas";
import {
  getStaffProfile,
  getStaffReferenceData,
} from "@/features/staff/server/queries";
import { requirePermission } from "@/lib/auth/access";
import { hasPermission } from "@/lib/permissions/contracts";

const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
        new Date(`${value}T00:00:00Z`),
      )
    : "Not recorded";
export default async function StaffProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const context = await requirePermission("staff.read");
  if (!context) return <PermissionDenied />;
  const id = staffIdSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const [staff, reference] = await Promise.all([
    getStaffProfile(id.data),
    getStaffReferenceData(),
  ]);
  if (!staff) notFound();
  const canManage = hasPermission(context, "staff.manage");
  const notice = (await searchParams).notice;
  return (
    <>
      <PageHeader
        title={staff.fullName}
        description={`${staff.staffNumber} · ${staff.position}`}
      >
        <Button asChild variant="outline">
          <Link href="/staff">
            <ArrowLeft /> Staff directory
          </Link>
        </Button>
      </PageHeader>
      {notice === "staff-added" && (
        <div
          className="mb-5 rounded-lg border border-success/20 bg-success-soft px-4 py-3 text-sm font-medium text-success"
          role="status"
        >
          Staff profile created. No login account was created.
        </div>
      )}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-5">
          <section className="panel p-5 sm:p-6" aria-labelledby="profile-title">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b pb-4">
              <div>
                <h2 id="profile-title" className="text-base font-semibold">
                  Profile
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Employment identity and contact details.
                </p>
              </div>
              <StatusBadge
                status={
                  staff.status === "active"
                    ? "Active"
                    : staff.status === "inactive"
                      ? "Inactive"
                      : "Archived"
                }
              />
            </div>
            <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  Staff type
                </dt>
                <dd className="mt-1 text-sm font-semibold">
                  {staff.staffType === "teaching" ? "Teaching" : "Non-teaching"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  Position
                </dt>
                <dd className="mt-1 text-sm font-semibold">{staff.position}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  Date joined
                </dt>
                <dd className="mt-1 text-sm font-semibold">
                  {date(staff.dateJoined)}
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Phone className="size-3.5" /> Phone
                </dt>
                <dd className="mt-1 text-sm">{staff.phone}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Mail className="size-3.5" /> Email
                </dt>
                <dd className="mt-1 text-sm">
                  {staff.email ?? "Not recorded"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">
                  Staff ID
                </dt>
                <dd className="mt-1 break-all font-mono text-xs">
                  {staff.staffNumber}
                </dd>
              </div>
            </dl>
          </section>
          <section
            className="panel overflow-hidden"
            aria-labelledby="assignment-history-title"
          >
            <div className="border-b p-5">
              <h2
                id="assignment-history-title"
                className="text-base font-semibold"
              >
                Class assignments
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Current and completed assignment history.
              </p>
            </div>
            {staff.assignments.length ? (
              <div
                className="table-scroll"
                tabIndex={0}
                role="region"
                aria-label="Staff class assignment history"
              >
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/70 hover:bg-muted/70">
                      <TableHead className="px-5">Class</TableHead>
                      <TableHead>Academic period</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Ended</TableHead>
                      <TableHead className="pr-5">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staff.assignments.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="px-5 font-semibold">
                          {item.className}
                        </TableCell>
                        <TableCell>
                          {item.academicYearName} · {item.academicTermName}
                        </TableCell>
                        <TableCell>{date(item.startedOn)}</TableCell>
                        <TableCell>{date(item.endedOn)}</TableCell>
                        <TableCell className="pr-5">
                          <StatusBadge
                            status={
                              item.status === "active" ? "Active" : "Completed"
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="p-8 text-center">
                <BriefcaseBusiness className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-3 text-sm font-semibold">
                  No class assignments yet
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add one below when this staff member is assigned to a class.
                </p>
              </div>
            )}
          </section>
          {canManage && (
            <StaffProfileActions staff={staff} reference={reference} />
          )}
          <section
            className="panel border-dashed p-5"
            aria-labelledby="salary-title"
          >
            <div className="flex items-start gap-3">
              <LockKeyhole className="mt-0.5 size-5 text-muted-foreground" />
              <div>
                <h2 id="salary-title" className="text-sm font-semibold">
                  Salary deductions
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Available in the finance phase. No salary or deduction records
                  have been created.
                </p>
              </div>
            </div>
          </section>
        </div>
        <aside className="space-y-4" aria-label="Staff record context">
          <section className="panel p-5">
            <h2 className="text-sm font-semibold">Audit context</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Created by</dt>
                <dd className="mt-1 font-medium">{staff.createdBy}</dd>
                <dd className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(staff.createdAt))}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  Last updated by
                </dt>
                <dd className="mt-1 font-medium">{staff.updatedBy}</dd>
                <dd className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(staff.updatedAt))}
                </dd>
              </div>
            </dl>
          </section>
          <section className="panel p-5">
            <CalendarDays className="size-5 text-primary" />
            <h2 className="mt-3 text-sm font-semibold">Account separation</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This staff profile is not a login. Administrator accounts are
              provisioned separately.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
