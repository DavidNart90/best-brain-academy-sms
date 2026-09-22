import { NextResponse, type NextRequest } from "next/server";
import { passwordChangeSchema } from "@/features/auth/schemas";
import { getPublicEnvironment } from "@/lib/env";
import { parseAccessContext } from "@/lib/permissions/contracts";
import { consumeAuthenticatedRateLimit } from "@/lib/security/rate-limit";
import {
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
    return json({ error: "This password request was blocked." }, 403);
  if (!hasContentType(request, "application/json"))
    return json({ error: "Review the password fields and try again." }, 415);

  let input: unknown;
  try {
    input = await readBoundedJson(request, 4096);
  } catch (error) {
    return json(
      { error: "Review the password fields and try again." },
      error instanceof RequestBodyTooLargeError
        ? 413
        : error instanceof InvalidRequestBodyError
          ? 400
          : 400,
    );
  }
  const parsed = passwordChangeSchema.safeParse(input);
  if (!parsed.success)
    return json(
      {
        error: parsed.error.issues[0]?.message ?? "Choose a stronger password.",
      },
      400,
    );
  if (!getPublicEnvironment())
    return json({ error: "Password changes are not configured." }, 503);

  const supabase = await createServerSupabaseClient(true);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user)
    return json({ error: "Your session has expired. Sign in again." }, 401);

  const { data: access, error: accessError } =
    await supabase.rpc("get_access_context");
  const context = accessError ? null : parseAccessContext(access, user.id);
  if (!context || context.status !== "active" || context.roles.length === 0)
    return json({ error: "Your account does not have access." }, 403);
  if (!user.email)
    return json({ error: "Your account cannot be verified." }, 400);
  const completingInitialSetup = context.mustChangePassword;

  const limit = await consumeAuthenticatedRateLimit("password-change");
  if (limit.status === "unavailable")
    return json(
      { error: "Password changes are temporarily unavailable." },
      503,
    );
  if (limit.status === "denied")
    return NextResponse.json(
      { error: "Too many attempts. Please wait before trying again." },
      {
        status: 429,
        headers: { ...noStore, "Retry-After": String(limit.retryAfter) },
      },
    );

  const { data: verified, error: verificationError } =
    await supabase.auth.signInWithPassword({
      email: user.email,
      password: parsed.data.currentPassword,
    });
  if (verificationError || verified.user?.id !== user.id)
    return json({ error: "Your current password is incorrect." }, 400);

  const { error } = await supabase.auth.updateUser({
    current_password: parsed.data.currentPassword,
    password: parsed.data.newPassword,
  });
  if (error)
    return json(
      {
        error:
          error.status === 429
            ? "Too many attempts. Please wait before trying again."
            : "Your password could not be changed. Check your current password and try again.",
      },
      error.status === 429 ? 429 : 400,
    );

  await supabase.auth.signOut({ scope: "others" });
  if (completingInitialSetup) {
    const { data: refreshed } = await supabase.rpc("get_access_context");
    const refreshedContext = parseAccessContext(refreshed, user.id);
    if (!refreshedContext || refreshedContext.mustChangePassword)
      return json(
        {
          error:
            "Your password changed, but account setup needs administrator review.",
        },
        409,
      );
  }

  return json({
    ok: true,
    next: completingInitialSetup
      ? "/dashboard"
      : "/settings/profile?notice=password-updated",
  });
}
