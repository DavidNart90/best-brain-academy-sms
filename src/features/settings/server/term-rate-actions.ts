"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRateLimitedPermission } from "@/lib/security/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { TermRateDomain } from "@/types/term-rate-configuration";

export type TermRateActionResult = { ok: boolean; message: string };

const inputSchema = z.object({
  academicTermId: z.coerce.number().int().positive(),
  domain: z.enum(["school_fees", "library_prospectus"]),
});

function permissionFor(domain: TermRateDomain) {
  return domain === "school_fees"
    ? "finance.fees.manage"
    : "library.settings.manage";
}

function labelFor(domain: TermRateDomain) {
  return domain === "school_fees" ? "School fees" : "Books & Prospectus";
}

function refreshRatePages() {
  revalidatePath("/settings/financials");
  revalidatePath("/financials/fees");
  revalidatePath("/financials/end-of-term-invoices");
  revalidatePath("/library");
}

function databaseMessage(error: { code?: string; message?: string } | null) {
  if (!error) return "The term-rate change could not be saved.";
  if (error.code === "42501") return "Your account cannot change these rates.";
  if (["22023", "23503", "23505", "23514"].includes(error.code ?? ""))
    return error.message ?? "Review the term-rate configuration.";
  return "The term-rate change could not be saved.";
}

export async function prepareTermRateDraft(
  input: unknown,
): Promise<TermRateActionResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Choose a valid term." };
  const access = await requireRateLimitedPermission(
    permissionFor(parsed.data.domain),
    "configuration-write",
  );
  if (!access.ok) return { ok: false, message: access.message };
  const supabase = await createServerSupabaseClient();
  const result = await supabase.rpc("prepare_term_rate_configuration", {
    target_academic_term_id: parsed.data.academicTermId,
    target_domain: parsed.data.domain,
  });
  if (result.error)
    return { ok: false, message: databaseMessage(result.error) };
  const payload = result.data as { copiedCount?: number; created?: boolean };
  refreshRatePages();
  const copied = Number(payload.copiedCount ?? 0);
  return {
    ok: true,
    message: payload.created
      ? `${labelFor(parsed.data.domain)} draft created${copied ? ` with ${copied} copied rate${copied === 1 ? "" : "s"}` : ""}.`
      : `${labelFor(parsed.data.domain)} draft is already available.`,
  };
}

export async function approveTermRateConfiguration(
  input: unknown,
): Promise<TermRateActionResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Choose a valid term." };
  const access = await requireRateLimitedPermission(
    permissionFor(parsed.data.domain),
    "configuration-write",
  );
  if (!access.ok) return { ok: false, message: access.message };
  const supabase = await createServerSupabaseClient();
  const result = await supabase.rpc("approve_term_rate_configuration", {
    target_academic_term_id: parsed.data.academicTermId,
    target_domain: parsed.data.domain,
  });
  if (result.error)
    return { ok: false, message: databaseMessage(result.error) };
  refreshRatePages();
  return {
    ok: true,
    message: `${labelFor(parsed.data.domain)} approved and locked for billing.`,
  };
}
