import { z } from "zod";

export const permissionSchema = z.enum([
  "dashboard.read",
  "admissions.read",
  "students.read",
  "classes.read",
  "staff.read",
  "financials.read",
  "reports.read",
  "administrators.manage",
  "settings.manage",
]);
export type Permission = z.infer<typeof permissionSchema>;
export const roleSchema = z.enum([
  "SUPER_ADMIN",
  "ADMINISTRATOR",
  "ACCOUNTANT",
  "MANAGEMENT",
]);
export type Role = z.infer<typeof roleSchema>;
export const accessContextSchema = z.object({
  id: z.uuid(),
  displayName: z.string().max(120),
  status: z.enum(["pending", "active", "disabled"]),
  roles: z.array(roleSchema).max(4),
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
