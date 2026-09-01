import { NextResponse, type NextRequest } from "next/server";
import { loginSchema } from "@/features/auth/schemas";
import { getPublicEnvironment } from "@/lib/env";
import { isSameOriginAsHost } from "@/lib/auth/origin";
import { parseAccessContext } from "@/lib/permissions/contracts";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const noStore = { "Cache-Control": "private, no-store" };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: noStore });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && (!host || !isSameOriginAsHost(origin, host)))
    return json({ error: "This sign-in request was blocked." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({ error: "Enter a valid email and password." }, 415);
  if (Number(request.headers.get("content-length") ?? 0) > 4096)
    return json({ error: "Enter a valid email and password." }, 413);

  const input = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success)
    return json({ error: "Enter a valid email and password." }, 400);
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
