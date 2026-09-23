import { z } from "zod";

export const permissionSchema = z.enum([
  "dashboard.read",
  "admissions.read",
  "students.read",
  "students.manage",
  "students.import",
  "students.export",
  "classes.read",
  "staff.read",
  "staff.manage",
  "staff.import",
  "staff.export",
  "people.lifecycle.manage",
  "financials.read",
  "reports.read",
  "administrators.manage",
  "settings.manage",
  "finance.settings.manage",
  "finance.transactions.manage",
  "finance.end_term_invoices.read",
  "finance.end_term_invoices.manage",
  "finance.outstanding.read",
  "finance.outstanding.print",
  "library.read",
  "library.collections.manage",
  "library.settings.manage",
  "audit.read",
]);
export type Permission = z.infer<typeof permissionSchema>;
export const roleSchema = z.enum([
  "SUPER_ADMIN",
  "ADMINISTRATOR",
  "ACCOUNTANT",
  "MANAGEMENT",
]);
export type Role = z.infer<typeof roleSchema>;
export const roleLabels: Record<Role, string> = {
  SUPER_ADMIN: "Super Administrator",
  ADMINISTRATOR: "Administrator",
  ACCOUNTANT: "Accountant",
  MANAGEMENT: "Board Member",
};
export function getRoleLabel(role: string | null | undefined) {
  const parsed = roleSchema.safeParse(role);
  return parsed.success ? roleLabels[parsed.data] : (role ?? "Unassigned");
}
export const accessContextSchema = z.object({
  id: z.uuid(),
  displayName: z.string().max(120),
  status: z.enum(["pending", "active", "disabled"]),
  mustChangePassword: z.boolean(),
  roles: z.array(roleSchema).max(5),
  permissions: z.array(permissionSchema).max(50),
});
export type AccessContext = z.infer<typeof accessContextSchema>;

export function hasPermission(
  context: AccessContext | null,
  permission: Permission,
) {
  return (
    context?.status === "active" && context.permissions.includes(permission)
  );
}

export function parseAccessContext(
  value: unknown,
  verifiedUserId: string,
): AccessContext | null {
  const parsed = accessContextSchema.safeParse(value);
  if (!parsed.success || parsed.data.id !== verifiedUserId) return null;
  return parsed.data;
}
