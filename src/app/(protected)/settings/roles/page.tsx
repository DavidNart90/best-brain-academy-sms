import Link from "next/link";
import { Check, ShieldCheck, UsersRound, X } from "lucide-react";
import { PermissionDenied } from "@/components/data-display/page-state";
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
import { getRolePermissionMatrix } from "@/features/administrators/server/queries";
import { requirePermission } from "@/lib/auth/access";
import type { Permission } from "@/lib/permissions/contracts";

const permissionLabels: Record<Permission, string> = {
  "dashboard.read": "View dashboard",
  "admissions.read": "View admission records",
  "students.read": "View students",
  "students.manage": "Manage students and enrollments",
  "students.import": "Import students",
  "students.export": "Export students",
  "classes.read": "View classes",
  "staff.read": "View staff",
  "staff.manage": "Manage staff and assignments",
  "staff.import": "Import staff",
  "staff.export": "Export staff",
  "financials.read": "View financials",
  "reports.read": "View reports",
  "administrators.manage": "Manage administrator access",
  "settings.manage": "Manage school settings",
  "finance.settings.manage": "Configure fee rates and finance categories",
  "finance.transactions.manage":
    "Generate invoices and process financial transactions",
  "audit.read": "View audit history",
};

export default async function RolesAndPermissionsPage() {
  const context = await requirePermission("administrators.manage");
  if (!context) return <PermissionDenied />;
  const matrix = await getRolePermissionMatrix();

  return (
    <>
      <PageHeader
        title="Roles & permissions"
        description="Review the live access granted to each administrator role. Role changes take effect immediately."
      >
        <Button asChild>
          <Link href="/administrators">
            <UsersRound /> Manage administrators
          </Link>
        </Button>
      </PageHeader>

      <section
        className="panel overflow-hidden"
        aria-labelledby="role-summary-title"
      >
        <div className="flex flex-col gap-4 border-b bg-muted/25 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="role-summary-title" className="text-base font-semibold">
              Current access matrix
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Permissions are enforced by the server and database, not only by
              navigation visibility.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-success">
            <ShieldCheck className="size-4" aria-hidden="true" />
            {matrix.roles.length} roles · {matrix.permissions.length}{" "}
            permissions
          </div>
        </div>

        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Role permission matrix"
        >
          <Table className="min-w-230">
            <TableHeader>
              <TableRow className="bg-muted/70 hover:bg-muted/70">
                <TableHead className="min-w-64 px-5">Permission</TableHead>
                {matrix.roles.map((role) => (
                  <TableHead key={role.code} className="min-w-40 text-center">
                    {role.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrix.permissions.map((permission) => (
                <TableRow key={permission.code}>
                  <TableCell className="px-5 py-4">
                    <p className="font-medium">
                      {permissionLabels[permission.code]}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {permission.code}
                    </p>
                  </TableCell>
                  {matrix.roles.map((role) => {
                    const granted = permission.roleCodes.includes(role.code);
                    return (
                      <TableCell key={role.code} className="text-center">
                        <span
                          className={
                            granted
                              ? "inline-flex size-7 items-center justify-center rounded-full bg-success-soft text-success"
                              : "inline-flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground"
                          }
                        >
                          {granted ? (
                            <Check className="size-4" aria-hidden="true" />
                          ) : (
                            <X className="size-4" aria-hidden="true" />
                          )}
                          <span className="sr-only">
                            {granted ? "Granted" : "Not granted"}
                          </span>
                        </span>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <aside className="mt-5 border-l-2 border-primary/55 bg-brand-subtle/55 px-4 py-3">
        <p className="text-sm font-medium">
          Role templates are controlled centrally
        </p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Assign a role from the Administrators page. Super Administrator is the
          only role that can configure administrator accounts and school
          settings.
        </p>
      </aside>
    </>
  );
}
