import "server-only";

import { getAccessContext } from "./access";
import { hasPermission, type Permission } from "@/lib/permissions/contracts";
import {
  consumeAuthenticatedRateLimit,
  type RateLimitBucket,
} from "@/lib/security/rate-limit";

export async function hasApiPermission(permission: Permission) {
  try {
    return hasPermission(await getAccessContext(), permission);
  } catch {
    return false;
  }
}

function errorResponse(message: string, status: number, retryAfter?: number) {
  const headers = new Headers({ "Cache-Control": "private, no-store" });
  if (retryAfter) headers.set("Retry-After", String(retryAfter));
  return Response.json({ message }, { status, headers });
}

export async function guardApiRequest(
  permission: Permission,
  bucket?: RateLimitBucket,
) {
  let context;
  try {
    context = await getAccessContext();
  } catch {
    return {
      ok: false as const,
      response: errorResponse("Account access could not be verified.", 503),
    };
  }
  if (!context)
    return {
      ok: false as const,
      response: errorResponse("Sign in to continue.", 401),
    };
  if (!hasPermission(context, permission))
    return {
      ok: false as const,
      response: errorResponse("You do not have access to this operation.", 403),
    };
  if (bucket) {
    const decision = await consumeAuthenticatedRateLimit(bucket);
    if (decision.status === "unavailable")
      return {
        ok: false as const,
        response: errorResponse(
          "This operation is temporarily unavailable. Please try again.",
          503,
        ),
      };
    if (decision.status === "denied")
      return {
        ok: false as const,
        response: errorResponse(
          "Too many requests. Please wait before trying again.",
          429,
          decision.retryAfter,
        ),
      };
  }
  return { ok: true as const, context };
}
