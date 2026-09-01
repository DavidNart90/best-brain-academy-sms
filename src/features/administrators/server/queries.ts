import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { administratorListQuerySchema } from "../schemas";
import type {
  AdministratorDirectoryRow,
  AdministratorPageResult,
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
