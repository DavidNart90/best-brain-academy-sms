import Link from "next/link";
import {
  Download,
  FileDown,
  FileSpreadsheet,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdministratorAccessDialog } from "@/features/administrators/components/administrator-access-dialog";
import { AdministratorFilters } from "@/features/administrators/components/administrator-filters";
import { AdministratorImportDialog } from "@/features/administrators/components/administrator-import-dialog";
import { AdministratorInviteDialog } from "@/features/administrators/components/administrator-invite-dialog";
import { getAdministratorPage } from "@/features/administrators/server/queries";
import { requirePermission } from "@/lib/auth/access";

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Administrator",
  ADMINISTRATOR: "Administrator",
  ACCOUNTANT: "Accountant",
  MANAGEMENT: "Management",
};
function hrefFor(
  query: Awaited<ReturnType<typeof getAdministratorPage>>["query"],
  page?: number,
) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.status !== "all") params.set("status", query.status);
  if (query.role !== "all") params.set("role", query.role);
  if (page && page > 1) params.set("page", String(page));
  return params.size ? `/administrators?${params}` : "/administrators";
}

export default async function AdministratorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requirePermission("administrators.manage");
  if (!context) return <PermissionDenied />;
  const raw = await searchParams;
  const result = await getAdministratorPage(raw);
  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));
  const exportHref = hrefFor(result.query).replace(
    "/administrators",
    "/api/administrators/export",
  );
  return (
    <>
      <PageHeader
        title="Administrators"
        description="Provision school logins, assign one controlled role and disable access without touching staff records."
      >
        <AdministratorInviteDialog />
      </PageHeader>
      {result.allTotal === 0 ? (
        <DirectoryEmptyState
          title="Your administrator directory is ready"
          description="Create one administrator or use the reviewed spreadsheet workflow. Every account receives one role and must replace its temporary password."
          actions={[
            {
              label: "Add Administrator",
              description: "Create one school login with a role and status.",
              icon: UserRoundPlus,
              content: <AdministratorInviteDialog />,
            },
            {
              label: "Download Excel Template",
              description: "Use the approved account and role columns.",
              icon: FileSpreadsheet,
              content: (
                <Button asChild variant="outline">
                  <Link href="/api/administrators/template" prefetch={false}>
                    <FileDown /> Download Excel Template
                  </Link>
                </Button>
              ),
            },
            {
              label: "Import Administrators",
              description:
                "Preview row errors and duplicates before confirmation.",
              icon: Upload,
              content: <AdministratorImportDialog />,
            },
          ]}
        />
      ) : (
        <section
          className="panel overflow-hidden"
          aria-labelledby="administrator-directory-title"
        >
          <div className="border-b p-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2
                  id="administrator-directory-title"
                  className="text-base font-semibold"
                >
                  Administrator directory
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {result.total} matching{" "}
                  {result.total === 1 ? "account" : "accounts"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/api/administrators/template" prefetch={false}>
                    <FileSpreadsheet /> Template
                  </Link>
                </Button>
                <AdministratorImportDialog />
                <Button asChild variant="outline" size="sm">
                  <Link href={exportHref} prefetch={false}>
                    <Download /> Export table
                  </Link>
                </Button>
              </div>
            </div>
            <AdministratorFilters initial={result.query} />
          </div>
          {result.rows.length === 0 ? (
            <div className="p-5">
              <PageState
                title="No administrators match this search"
                description="Try another name, email, phone, role or account status."
              />
            </div>
          ) : (
            <>
              <div
                className="table-scroll"
                tabIndex={0}
                role="region"
                aria-label="Administrator directory table"
              >
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/70 hover:bg-muted/70">
                      <TableHead className="px-5">Administrator</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Last sign in</TableHead>
                      <TableHead className="pr-5 text-right">Access</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.rows.map((account) => (
                      <TableRow key={account.userId}>
                        <TableCell className="px-5 py-4">
                          <p className="font-semibold">{account.displayName}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {account.email}
                            {account.phone ? ` · ${account.phone}` : ""}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {account.role
                              ? (roleLabels[account.role] ?? account.role)
                              : "Unassigned"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={
                              account.status === "active"
                                ? "Active"
                                : account.status === "disabled"
                                  ? "Disabled"
                                  : "Pending"
                            }
                          />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {account.lastSignInAt
                            ? new Intl.DateTimeFormat("en-GB", {
                                dateStyle: "medium",
                              }).format(new Date(account.lastSignInAt))
                            : "Never"}
                        </TableCell>
                        <TableCell className="pr-5 text-right">
                          <AdministratorAccessDialog
                            account={account}
                            currentUserId={context.id}
                          />
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
                itemLabel={result.total === 1 ? "account" : "accounts"}
                hrefForPage={(page) => hrefFor(result.query, page)}
              />
            </>
          )}
        </section>
      )}
    </>
  );
}
