"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/access";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import {
  endStaffAssignmentSchema,
  staffAssignmentSchema,
  staffIdSchema,
  staffInputSchema,
} from "../schemas";

export type StaffActionResult = {
  ok: boolean;
  message: string;
  staffId?: number;
};
const denied = {
  ok: false,
  message: "Your account cannot manage staff.",
} satisfies StaffActionResult;
function databaseMessage(error: { code?: string; message?: string }) {
  if (error.code === "23505")
    return error.message?.includes("assignment")
      ? "That class assignment already exists for this academic period."
      : "That staff ID already belongs to a staff member.";
  if (error.code === "23503" || error.code === "23514")
    return "The selected academic year, term or class is no longer available.";
  if (error.code === "22023")
    return error.message ?? "Review the staff details and try again.";
  if (error.code === "42501") return denied.message;
  return "The staff record could not be saved. Review the details and try again.";
}

export async function createStaff(input: unknown): Promise<StaffActionResult> {
  if (!(await requirePermission("staff.manage"))) return denied;
  const parsed = staffInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the staff details.",
    };
  const supabase = await createServerSupabaseClient();
  const result = await supabase.rpc("create_staff", {
    payload: parsed.data as unknown as Json,
  });
  if (result.error)
    return { ok: false, message: databaseMessage(result.error) };
  const staffId = Number(
    (result.data as { staffId?: unknown } | null)?.staffId,
  );
  revalidatePath("/staff");
  return {
    ok: true,
    message: "Staff member added without creating a login account.",
    staffId: Number.isInteger(staffId) ? staffId : undefined,
  };
}

export async function assignStaffClass(
  input: unknown,
): Promise<StaffActionResult> {
  if (!(await requirePermission("staff.manage"))) return denied;
  const parsed = staffAssignmentSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the assignment.",
    };
  const { staffId, ...payload } = parsed.data;
  const supabase = await createServerSupabaseClient();
  const result = await supabase.rpc("assign_staff_class", {
    target_staff_id: staffId,
    payload: payload as unknown as Json,
  });
  if (result.error)
    return { ok: false, message: databaseMessage(result.error) };
  revalidatePath("/staff");
  revalidatePath(`/staff/${staffId}`);
  return {
    ok: true,
    message: "Class assignment added and history preserved.",
    staffId,
  };
}

export async function endStaffAssignment(
  input: unknown,
): Promise<StaffActionResult> {
  if (!(await requirePermission("staff.manage"))) return denied;
  const parsed = endStaffAssignmentSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the end date.",
    };
  const supabase = await createServerSupabaseClient();
  const result = await supabase.rpc("end_staff_assignment", {
    target_assignment_id: parsed.data.assignmentId,
    target_ended_on: parsed.data.endedOn,
  });
  if (result.error)
    return { ok: false, message: databaseMessage(result.error) };
  revalidatePath("/staff");
  revalidatePath(`/staff/${parsed.data.staffId}`);
  return {
    ok: true,
    message: "Assignment ended; its history remains available.",
    staffId: parsed.data.staffId,
  };
}

export async function archiveStaff(input: unknown): Promise<StaffActionResult> {
  if (!(await requirePermission("staff.manage"))) return denied;
  const parsed = staffIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Staff record not found." };
  const supabase = await createServerSupabaseClient();
  const result = await supabase.rpc("archive_staff", {
    target_staff_id: parsed.data,
  });
  if (result.error)
    return { ok: false, message: databaseMessage(result.error) };
  revalidatePath("/staff");
  revalidatePath(`/staff/${parsed.data}`);
  return {
    ok: true,
    message:
      "Staff record archived; assignments and audit history were preserved.",
    staffId: parsed.data,
  };
}
