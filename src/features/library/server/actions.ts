"use server";

import { revalidatePath } from "next/cache";
import { requireRateLimitedPermission } from "@/lib/security/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  libraryCollectionSchema,
  libraryGenerateSchema,
  libraryRateSchema,
  libraryReversalSchema,
} from "../schemas";

export type LibraryActionResult = {
  ok: boolean;
  message: string;
  skipped?: Array<{ studentId: number; reason: string }>;
};

const denied = (message: string): LibraryActionResult => ({
  ok: false,
  message,
});

function databaseMessage(error: { code?: string; message?: string }) {
  if (error.code === "42501")
    return "Your account cannot perform this Library action.";
  if (["22023", "23503", "23505", "23514"].includes(error.code ?? ""))
    return error.message ?? "Review the Library details and try again.";
  return "The Library record could not be saved.";
}

function refreshLibrary() {
  revalidatePath("/library");
  revalidatePath("/financials");
  revalidatePath("/financials/invoices", "layout");
}

export async function saveLibraryRate(
  input: unknown,
): Promise<LibraryActionResult> {
  const access = await requireRateLimitedPermission(
    "library.settings.manage",
    "configuration-write",
  );
  if (!access.ok) return denied(access.message);
  const parsed = libraryRateSchema.safeParse(input);
  if (!parsed.success)
    return denied(parsed.error.issues[0]?.message ?? "Review the term rate.");
  const supabase = await createServerSupabaseClient();
  const result = await supabase.rpc("set_library_term_rate", {
    target_academic_term_id: parsed.data.academicTermId,
    target_class_id: parsed.data.classId,
    target_charge_status: parsed.data.chargeStatus,
    target_amount: parsed.data.amount ?? undefined,
  });
  if (result.error) return denied(databaseMessage(result.error));
  refreshLibrary();
  return {
    ok: true,
    message:
      parsed.data.chargeStatus === "not_charged"
        ? "Class marked as not charged for this term."
        : "Books & Prospectus term rate saved.",
  };
}

export async function generateLibraryCharges(
  input: unknown,
): Promise<LibraryActionResult> {
  const access = await requireRateLimitedPermission(
    "library.collections.manage",
    "library-write",
  );
  if (!access.ok) return denied(access.message);
  const parsed = libraryGenerateSchema.safeParse(input);
  if (!parsed.success)
    return denied(parsed.error.issues[0]?.message ?? "Choose a valid term.");
  const supabase = await createServerSupabaseClient();
  const result = await supabase.rpc("generate_library_term_charges", {
    target_academic_term_id: parsed.data.academicTermId,
    target_student_id: parsed.data.studentId ?? undefined,
  });
  if (result.error) return denied(databaseMessage(result.error));
  const payload = result.data as {
    createdCount?: number;
    skipped?: Array<{ studentId: number; reason: string }>;
  };
  refreshLibrary();
  const created = Number(payload.createdCount ?? 0);
  return {
    ok: true,
    message: `${created} Library ${created === 1 ? "charge" : "charges"} generated.`,
    skipped: payload.skipped ?? [],
  };
}

export async function recordLibraryCollection(
  input: unknown,
): Promise<LibraryActionResult> {
  const access = await requireRateLimitedPermission(
    "library.collections.manage",
    "library-write",
  );
  if (!access.ok) return denied(access.message);
  const parsed = libraryCollectionSchema.safeParse(input);
  if (!parsed.success)
    return denied(
      parsed.error.issues[0]?.message ?? "Review the collection details.",
    );
  const supabase = await createServerSupabaseClient();
  const result = await supabase.rpc("record_library_collection", {
    target_request_key: parsed.data.requestKey,
    target_charge_id: parsed.data.chargeId,
    payment_amount: parsed.data.amount,
    target_business_date: parsed.data.businessDate,
    target_payment_method_id: parsed.data.paymentMethodId,
    target_external_reference: parsed.data.externalReference ?? undefined,
    target_notes: parsed.data.notes ?? undefined,
  });
  if (result.error) return denied(databaseMessage(result.error));
  const payload = result.data as {
    collectionNumber?: string;
    remainingBalance?: number;
  };
  refreshLibrary();
  return {
    ok: true,
    message: `${payload.collectionNumber ?? "Library collection"} recorded. Remaining Library balance: GHS ${Number(payload.remainingBalance ?? 0).toFixed(2)}.`,
  };
}

export async function reverseLibraryCollection(
  input: unknown,
): Promise<LibraryActionResult> {
  const access = await requireRateLimitedPermission(
    "library.collections.manage",
    "library-write",
  );
  if (!access.ok) return denied(access.message);
  const parsed = libraryReversalSchema.safeParse(input);
  if (!parsed.success)
    return denied(
      parsed.error.issues[0]?.message ?? "Enter a reversal reason.",
    );
  const supabase = await createServerSupabaseClient();
  const result = await supabase.rpc("reverse_library_collection", {
    target_request_key: parsed.data.requestKey,
    target_collection_id: parsed.data.collectionId,
    target_reason: parsed.data.reason,
  });
  if (result.error) return denied(databaseMessage(result.error));
  const payload = result.data as { reversalNumber?: string };
  refreshLibrary();
  return {
    ok: true,
    message: `Collection reversed${payload.reversalNumber ? ` · ${payload.reversalNumber}` : ""}.`,
  };
}
