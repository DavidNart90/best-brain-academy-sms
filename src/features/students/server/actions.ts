"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/access";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import {
  enrollmentChangeSchema,
  guardianLinkSchema,
  studentInputSchema,
} from "../schemas";

export type StudentActionResult = {
  ok: boolean;
  message: string;
  studentId?: number;
};

const denied: StudentActionResult = {
  ok: false,
  message: "Your account cannot add students.",
};

function studentDatabaseMessage(error: { code?: string; message?: string }) {
  if (error.code === "23505")
    return error.message?.includes("possible duplicate")
      ? "A possible duplicate student already exists. Check the name, date of birth and admission number."
      : "That admission number already belongs to a student.";
  if (error.code === "23514" || error.code === "23503")
    return "The selected academic year, term, class or student location is no longer available.";
  if (error.code === "42501") return denied.message;
  return "The student could not be added. Review the details and try again.";
}

export async function createStudent(
  input: unknown,
): Promise<StudentActionResult> {
  const context = await requirePermission("students.manage");
  if (!context) return denied;
  const parsed = studentInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the student details.",
    };
  const supabase = await createServerSupabaseClient();
  const result = await supabase.rpc("create_student", {
    payload: parsed.data as unknown as Json,
  });
  if (result.error)
    return { ok: false, message: studentDatabaseMessage(result.error) };
  const response = result.data as { studentId?: unknown } | null;
  const studentId = Number(response?.studentId);
  revalidatePath("/students");
  return {
    ok: true,
    message: "Student added with an active enrollment.",
    studentId: Number.isInteger(studentId) ? studentId : undefined,
  };
}

export async function linkStudentGuardian(
  input: unknown,
): Promise<StudentActionResult> {
  const context = await requirePermission("students.manage");
  if (!context) return denied;
  const parsed = guardianLinkSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the guardian details.",
    };
  const { studentId, ...payload } = parsed.data;
  const supabase = await createServerSupabaseClient();
  const result = await supabase.rpc("link_student_guardian", {
    target_student_id: studentId,
    payload: payload as unknown as Json,
  });
  if (result.error)
    return { ok: false, message: studentDatabaseMessage(result.error) };
  revalidatePath(`/students/${studentId}`);
  return { ok: true, message: "Guardian linked successfully." };
}

export async function changeStudentEnrollment(
  input: unknown,
): Promise<StudentActionResult> {
  const context = await requirePermission("students.manage");
  if (!context) return denied;
  const parsed = enrollmentChangeSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ?? "Check the enrollment details.",
    };
  const { studentId, ...payload } = parsed.data;
  const supabase = await createServerSupabaseClient();
  const result = await supabase.rpc("change_student_enrollment", {
    target_student_id: studentId,
    payload: payload as unknown as Json,
  });
  if (result.error)
    return {
      ok: false,
      message:
        result.error.code === "22023"
          ? "Choose a different enrollment assignment."
          : result.error.code === "23514"
            ? "Review the enrollment date and active academic selections."
            : studentDatabaseMessage(result.error),
    };
  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);
  return {
    ok: true,
    message: "Enrollment changed and prior history preserved.",
  };
}
