import type { Role } from "@/lib/permissions/contracts";

export type DashboardVariant =
  | "super-admin"
  | "administrator"
  | "accountant"
  | "board-member"
  | "librarian"
  | "workspace";

const rolePriority: Array<[Role, DashboardVariant]> = [
  ["SUPER_ADMIN", "super-admin"],
  ["ADMINISTRATOR", "administrator"],
  ["ACCOUNTANT", "accountant"],
  ["MANAGEMENT", "board-member"],
  ["LIBRARIAN", "librarian"],
];

export function resolveDashboardVariant(roles: Role[]): DashboardVariant {
  return (
    rolePriority.find(([role]) => roles.includes(role))?.[1] ?? "workspace"
  );
}
