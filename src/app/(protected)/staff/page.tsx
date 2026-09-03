import Link from "next/link";
import {
  Download,
  FileDown,
  FileSpreadsheet,
  Plus,
  Upload,
  UserRoundPlus,
} from "lucide-react";
import { DataTablePagination } from "@/components/data-display/data-table-pagination";
import { DirectoryEmptyState } from "@/components/data-display/directory-empty-state";
import {
  PageState,
  PermissionDenied,
} from "@/components/data-display/page-state";
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
import { StaffFilters } from "@/features/staff/components/staff-filters";
import { StaffImportDialog } from "@/features/staff/components/staff-import-dialog";
import { getStaffPage } from "@/features/staff/server/queries";
import { requirePermission } from "@/lib/auth/access";
import { hasPermission } from "@/lib/permissions/contracts";

const labels = {
  active: "Active",
  inactive: "Inactive",
  archived: "Archived",
} as const;
function hrefFor(
  query: Awaited<ReturnType<typeof getStaffPage>>["query"],
  page?: number,
) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.status !== "active") params.set("status", query.status);
  if (query.staffType !== "all") params.set("staffType", query.staffType);
  if (page && page > 1) params.set("page", String(page));
  return params.size ? `/staff?${params}` : "/staff";
}
function Disabled({ children }: { children: React.ReactNode }) {
  return (
    <Button variant="outline" disabled>
      {children}
    </Button>
  );
}

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requirePermission("staff.read");
  if (!context) return <PermissionDenied />;
  const raw = await searchParams;
  const result = await getStaffPage(raw);
  const canManage = hasPermission(context, "staff.manage");
  const canImport = hasPermission(context, "staff.import");
  const canExport = hasPermission(context, "staff.export");
  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));
  const exportHref = hrefFor(result.query).replace(
    "/staff",
    "/api/staff/export",
  );
  return (
    <>
      <PageHeader
        title="Staff"
        description="Manage teaching and non-teaching staff, class assignments and preserved employment history."
      >
        {canManage && (
          <Button asChild>
            <Link href="/staff/new">
              <Plus /> Add staff
            </Link>
          </Button>
        )}
      </PageHeader>
      {result.allTotal === 0 ? (
        <DirectoryEmptyState
          title="Your staff directory is ready"
          description="Add one staff member or use the reviewed spreadsheet workflow. Staff records never create login accounts."
          actions={[
            {
              label: "Add Staff",
              description: "Create one teaching or non-teaching staff profile.",
              icon: UserRoundPlus,
              content: canManage ? (
                <Button asChild>
                  <Link href="/staff/new">
                    <Plus /> Add Staff
                  </Link>
                </Button>
              ) : (
                <Disabled>
                  <Plus /> Add Staff
                </Disabled>
              ),
            },
            {
              label: "Download Excel Template",
              description: "Use the approved staff columns and active classes.",
              icon: FileSpreadsheet,
              content: canImport ? (
                <Button asChild variant="outline">
                  <Link href="/api/staff/template" prefetch={false}>
                    <FileDown /> Download Excel Template
                  </Link>
                </Button>
              ) : (
                <Disabled>
                  <FileDown /> Download Excel Template
                </Disabled>
              ),
            },
            {
              label: "Import Staff",
              description:
                "Preview validation and duplicates before confirmation.",
              icon: Upload,
              content: canImport ? (
                <StaffImportDialog />
              ) : (
                <Disabled>
                  <Upload /> Import Staff
                </Disabled>
              ),
            },
          ]}
        />
      ) : (
        <section
          className="panel overflow-hidden"
          aria-labelledby="staff-directory-title"
        >
          <div className="border-b p-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2
                  id="staff-directory-title"
                  className="text-base font-semibold"
                >
                  Staff directory
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {result.total} matching{" "}
                  {result.total === 1 ? "staff member" : "staff members"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {canImport && (
                  <>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/api/staff/template" prefetch={false}>
                        <FileSpreadsheet /> Template
                      </Link>
                    </Button>
                    <StaffImportDialog />
                  </>
                )}
                {canExport && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={exportHref} prefetch={false}>
                      <Download /> Export table
                    </Link>
                  </Button>
                )}
              </div>
            </div>
            <StaffFilters initial={result.query} />
          </div>
          {result.rows.length === 0 ? (
            <div className="p-5">
              <PageState
                title="No staff match this search"
                description="Try another name, staff ID, phone, position, type or status."
              />
            </div>
          ) : (
            <>
              <div
                className="table-scroll"
                tabIndex={0}
                role="region"
                aria-label="Staff directory table"
              >
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/70 hover:bg-muted/70">
                      <TableHead className="px-5">Staff member</TableHead>
                      <TableHead>Staff ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Assigned classes</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="pr-5">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.rows.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="px-5 py-4">
                          <Link
                            href={`/staff/${member.id}`}
                            className="font-semibold hover:text-primary hover:underline"
                          >
                            {member.fullName}
                          </Link>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {member.staffNumber}
                        </TableCell>
                        <TableCell>
                          {member.staffType === "teaching"
                            ? "Teaching"
                            : "Non-teaching"}
                        </TableCell>
                        <TableCell>{member.position}</TableCell>
                        <TableCell>{member.assignedClasses || "—"}</TableCell>
                        <TableCell>
                          <p>{member.phone ?? "Phone not recorded"}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {member.email ?? "No email"}
                          </p>
                        </TableCell>
                        <TableCell className="pr-5">
                          <StatusBadge status={labels[member.status]} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <DataTablePagination
                page={result.page}
                pageCount={pageCount}
                pageSize={result.pageSize}
                total={result.total}
                itemLabel={
                  result.total === 1 ? "staff member" : "staff members"
                }
                hrefForPage={(page) => hrefFor(result.query, page)}
              />
            </>
          )}
        </section>
      )}
    </>
  );
}
