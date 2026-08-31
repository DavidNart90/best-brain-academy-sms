import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPublicEnvironment } from "@/lib/env";
import {
  parseAccessContext,
  hasPermission,
  type Permission,
} from "@/lib/permissions/contracts";

export const getAccessContext = cache(async () => {
  if (!getPublicEnvironment()) return null;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data, error: accessError } = await supabase.rpc("get_access_context");
  if (accessError) throw new Error("Account access could not be verified.");
  return parseAccessContext(data, user.id);
});

export async function requireActiveAccount() {
  const context = await getAccessContext();
  if (!context) redirect("/login");
  if (context.status !== "active" || context.roles.length === 0)
    redirect("/login?notice=access");
  return context;
}

export async function requirePermission(permission: Permission) {
  const context = await requireActiveAccount();
  return hasPermission(context, permission) ? context : null;
}
