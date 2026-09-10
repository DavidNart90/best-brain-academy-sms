import "server-only";

import { z } from "zod";
import { requirePermission } from "@/lib/auth/access";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Permission } from "@/lib/permissions/contracts";

export const rateLimitBucketSchema = z.enum([
  "administrator-write",
  "configuration-write",
  "data-export",
  "data-import",
  "file-upload",
  "finance-settings",
  "finance-write",
  "invoice-search",
  "library-write",
  "password-change",
  "people-write",
  "report-export",
]);
export type RateLimitBucket = z.infer<typeof rateLimitBucketSchema>;

const decisionSchema = z.object({
  allowed: z.boolean(),
  remaining: z.number().int().nonnegative(),
  retryAfter: z.number().int().positive(),
});

export type RateLimitDecision =
  | ({ status: "allowed" | "denied" } & z.infer<typeof decisionSchema>)
  | { status: "unavailable"; allowed: false };

export async function consumeAuthenticatedRateLimit(
  bucket: RateLimitBucket,
): Promise<RateLimitDecision> {
  try {
    const supabase = await createServerSupabaseClient();
    const result = await supabase.rpc("consume_rate_limit", {
      rate_limit_bucket: bucket,
    });
    const decision = decisionSchema.safeParse(result.data);
    if (result.error || !decision.success)
      return { status: "unavailable", allowed: false };
    return {
      status: decision.data.allowed ? "allowed" : "denied",
      ...decision.data,
    };
  } catch {
    return { status: "unavailable", allowed: false };
  }
}

export async function requireRateLimitedPermission(
  permission: Permission,
  bucket: RateLimitBucket,
) {
  const context = await requirePermission(permission);
  if (!context)
    return {
      ok: false as const,
      message: "Your account does not have permission for this action.",
    };
  const decision = await consumeAuthenticatedRateLimit(bucket);
  if (decision.status === "unavailable")
    return {
      ok: false as const,
      message: "This action is temporarily unavailable. Please try again.",
    };
  if (decision.status === "denied")
    return {
      ok: false as const,
      message: `Too many requests. Try again in ${decision.retryAfter} seconds.`,
    };
  return { ok: true as const, context };
}
