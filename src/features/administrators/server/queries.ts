import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  permissionSchema,
  roleSchema,
  type Role,
} from "@/lib/permissions/contracts";
import { administratorListQuerySchema } from "../schemas";
import type {
  AdministratorDirectoryRow,
  AdministratorPageResult,
  RolePermissionMatrix,
} from "../types";

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

function mapRow(row: Record<string, unknown>): AdministratorDirectoryRow {
  return {
    userId: String(row.user_id),
    displayName: String(row.display_name || "Unnamed account"),
    email: String(row.email),
    phone: row.phone ? String(row.phone) : null,
    status: row.account_status as AdministratorDirectoryRow["status"],
    role: row.role_code ? String(row.role_code) : null,
    invitationStatus:
      row.invitation_status as AdministratorDirectoryRow["invitationStatus"],
    invitedAt: row.invited_at ? String(row.invited_at) : null,
    lastSignInAt: row.last_sign_in_at ? String(row.last_sign_in_at) : null,
    mfaEnrolled: Boolean(row.mfa_enrolled),
  };
}

async function loadRows(
  raw: Record<string, string | string[] | undefined>,
  pageSize: number,
  exportAll = false,
) {
  const query = administratorListQuerySchema.parse({
    q: first(raw.q),
    status: first(raw.status),
    role: first(raw.role),
    page: exportAll ? 1 : first(raw.page),
  });
  const supabase = await createServerSupabaseClient();
  const result = await supabase.rpc("get_administrator_directory", {
    search_text: query.q,
    status_filter: query.status,
    role_filter: query.role,
    page_number: exportAll ? 1 : query.page,
    page_size: pageSize,
  });
  if (result.error)
    throw new Error("Administrator accounts could not be loaded.");
  const rows = (result.data as Array<Record<string, unknown>>).map(mapRow);
  return { query, rows, total: Number(result.data?.[0]?.total_count ?? 0) };
}

export async function getAdministratorPage(
  raw: Record<string, string | string[] | undefined>,
): Promise<AdministratorPageResult> {
  const pageSize = 25;
  const [filtered, all] = await Promise.all([
    loadRows(raw, pageSize),
    loadRows({ status: "all", role: "all" }, 1),
  ]);
  return {
    rows: filtered.rows,
    total: filtered.total,
    allTotal: all.total,
    page: filtered.query.page,
    pageSize,
    query: filtered.query,
  };
}

export async function getAdministratorExportRows(
  raw: Record<string, string | string[] | undefined>,
) {
  return (await loadRows(raw, 5000, true)).rows;
}

export async function getMfaAssurance() {
  const supabase = await createServerSupabaseClient();
  const result = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return {
    currentLevel: result.data?.currentLevel ?? null,
    nextLevel: result.data?.nextLevel ?? null,
    verified: result.data?.currentLevel === "aal2",
  };
}

export async function getRolePermissionMatrix(): Promise<RolePermissionMatrix> {
  const supabase = await createServerSupabaseClient();
  const [rolesResult, permissionsResult, grantsResult] = await Promise.all([
    supabase.from("roles").select("code,label").limit(10),
    supabase.from("permissions").select("code,description").limit(100),
    supabase
      .from("role_permissions")
      .select("role_code,permission_code")
      .limit(500),
  ]);
  if (rolesResult.error || permissionsResult.error || grantsResult.error)
    throw new Error("Role permissions could not be loaded.");

  const roleOrder: Role[] = [
    "SUPER_ADMIN",
    "ADMINISTRATOR",
    "ACCOUNTANT",
    "MANAGEMENT",
  ];
  const roles = rolesResult.data
    .flatMap((item) => {
      const code = roleSchema.safeParse(item.code);
      return code.success ? [{ code: code.data, label: item.label }] : [];
    })
    .sort(
      (left, right) =>
        roleOrder.indexOf(left.code) - roleOrder.indexOf(right.code),
    );
  const grants = new Map<string, Role[]>();
  for (const item of grantsResult.data) {
    const role = roleSchema.safeParse(item.role_code);
    const permission = permissionSchema.safeParse(item.permission_code);
    if (!role.success || !permission.success) continue;
    const assigned = grants.get(permission.data) ?? [];
    assigned.push(role.data);
    grants.set(permission.data, assigned);
  }

  const permissions = permissionsResult.data
    .flatMap((item) => {
      const code = permissionSchema.safeParse(item.code);
      return code.success
        ? [
            {
              code: code.data,
              description: item.description,
              roleCodes: grants.get(code.data) ?? [],
            },
          ]
        : [];
    })
    .sort((left, right) => left.code.localeCompare(right.code));

  return { roles, permissions };
}
