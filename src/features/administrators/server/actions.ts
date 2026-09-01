"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/access";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  administratorInvitationBatchSchema,
  administratorRoleChangeSchema,
  administratorStatusChangeSchema,
} from "../schemas";

export type AdministratorActionResult = {
  ok: boolean;
  message: string;
  createdCount?: number;
};
const denied = {
  ok: false,
  message: "Your account cannot manage administrators.",
} satisfies AdministratorActionResult;

function databaseMessage(error: { code?: string; message?: string }) {
  if (error.code === "23505")
    return error.message ?? "That account already exists.";
  if (error.code === "22023")
    return error.message ?? "Review this administrator account.";
  if (error.code === "42501") return denied.message;
  return "The administrator account could not be updated.";
}

export async function inviteAdministrators(
  input: unknown,
): Promise<AdministratorActionResult> {
  if (!(await requirePermission("administrators.manage"))) return denied;
  const parsed = administratorInvitationBatchSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the account details.",
    };
  const supabase = await createServerSupabaseClient(true);
  const result = await supabase.functions.invoke("administrator-provision", {
    body: { invitations: parsed.data },
  });
  if (result.error) {
    let message = "The administrator account could not be created.";
    const context = "context" in result.error ? result.error.context : null;
    if (context instanceof Response) {
      const body = (await context.json().catch(() => null)) as {
        message?: string;
      } | null;
      if (body?.message) message = body.message;
    }
    return { ok: false, message };
  }
  const response = result.data as {
    createdCount?: number;
    failedCount?: number;
    message?: string;
  };
  revalidatePath("/administrators");
  return {
    ok: Number(response.failedCount ?? 0) === 0,
    message: response.message ?? "Account creation complete.",
    createdCount: Number(response.createdCount ?? 0),
  };
}

export async function changeAdministratorRole(
  input: unknown,
): Promise<AdministratorActionResult> {
  if (!(await requirePermission("administrators.manage"))) return denied;
  const parsed = administratorRoleChangeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Choose a valid role." };
  const supabase = await createServerSupabaseClient();
  const result = await supabase.rpc("change_administrator_role", {
    target_user_id: parsed.data.userId,
    target_role_code: parsed.data.role,
  });
  if (result.error)
    return { ok: false, message: databaseMessage(result.error) };
  revalidatePath("/administrators");
  revalidatePath("/settings/roles");
  return {
    ok: true,
    message: "Role updated. New permissions apply immediately.",
  };
}

export async function changeAdministratorStatus(
  input: unknown,
): Promise<AdministratorActionResult> {
  if (!(await requirePermission("administrators.manage"))) return denied;
  const parsed = administratorStatusChangeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Choose a valid status." };
  const supabase = await createServerSupabaseClient();
  const result = await supabase.rpc("set_administrator_status", {
    target_user_id: parsed.data.userId,
    target_status: parsed.data.status,
  });
  if (result.error)
    return { ok: false, message: databaseMessage(result.error) };
  revalidatePath("/administrators");
  return {
    ok: true,
    message:
      parsed.data.status === "disabled"
        ? "Account disabled. Existing app access is denied immediately."
        : "Account enabled. Access now follows its assigned role.",
  };
}
