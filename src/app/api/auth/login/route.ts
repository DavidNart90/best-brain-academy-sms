import { NextResponse, type NextRequest } from "next/server";
import { loginSchema } from "@/features/auth/schemas";
import { getPublicEnvironment } from "@/lib/env";
import { parseAccessContext } from "@/lib/permissions/contracts";
import {
  consumeLocalRateLimit,
  hasContentType,
  InvalidRequestBodyError,
  isTrustedMutationRequest,
  readBoundedJson,
  RequestBodyTooLargeError,
} from "@/lib/security/request";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const noStore = { "Cache-Control": "private, no-store" };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: noStore });
}

export async function POST(request: NextRequest) {
  if (!isTrustedMutationRequest(request))
    return json({ error: "This sign-in request was blocked." }, 403);
  if (!hasContentType(request, "application/json"))
    return json({ error: "Enter a valid email and password." }, 415);
  const globalLimit = consumeLocalRateLimit({
    scope: "login-global",
    identifier: "application",
    maxRequests: 100,
    windowSeconds: 300,
  });
  if (!globalLimit.allowed)
    return NextResponse.json(
      { error: "Too many sign-in attempts. Please wait before trying again." },
      {
        status: 429,
        headers: { ...noStore, "Retry-After": String(globalLimit.retryAfter) },
      },
    );

  let input: unknown;
  try {
    input = await readBoundedJson(request, 4096);
  } catch (error) {
    return json(
      { error: "Enter a valid email and password." },
      error instanceof RequestBodyTooLargeError
        ? 413
        : error instanceof InvalidRequestBodyError
          ? 400
          : 400,
    );
  }
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success)
    return json({ error: "Enter a valid email and password." }, 400);
  const accountLimit = consumeLocalRateLimit({
    scope: "login-account",
    identifier: parsed.data.email.trim().toLowerCase(),
    maxRequests: 10,
    windowSeconds: 600,
  });
  if (!accountLimit.allowed)
    return NextResponse.json(
      { error: "Too many sign-in attempts. Please wait before trying again." },
      {
        status: 429,
        headers: {
          ...noStore,
          "Retry-After": String(accountLimit.retryAfter),
        },
      },
    );
  if (!getPublicEnvironment())
    return json(
      {
        error: "Sign-in is not configured. Contact your school administrator.",
      },
      503,
    );

  const supabase = await createServerSupabaseClient(true);
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user)
    return json(
      {
        error:
          error?.status === 429
            ? "Too many sign-in attempts. Please wait before trying again."
            : "Unable to sign in. Check your details or contact your administrator.",
      },
      error?.status === 429 ? 429 : 401,
    );

  const { data: access, error: accessError } =
    await supabase.rpc("get_access_context");
  const context = accessError ? null : parseAccessContext(access, data.user.id);
  if (!context || context.status !== "active" || context.roles.length === 0) {
    await supabase.auth.signOut({ scope: "local" });
    return json(
      {
        error:
          "Your account does not have access. Contact your school administrator.",
      },
      403,
    );
  }

  return json({
    ok: true,
    next: context.mustChangePassword ? "/change-password" : "/dashboard",
  });
}
