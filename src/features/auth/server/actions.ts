"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPublicEnvironment } from "@/lib/env";
import { parseAccessContext } from "@/lib/permissions/contracts";
import { loginSchema, type AuthResult } from "@/features/auth/schemas";

export async function signIn(input: unknown): Promise<AuthResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { error: "Enter a valid email and password." };
  if (!getPublicEnvironment())
    return {
      error: "Sign-in is not configured. Contact your school administrator.",
    };
  const supabase = await createServerSupabaseClient(true);
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user)
    return {
      error:
        error?.status === 429
          ? "Too many sign-in attempts. Please wait before trying again."
          : "Unable to sign in. Check your details or contact your administrator.",
    };
  const { data: access, error: accessError } =
    await supabase.rpc("get_access_context");
  const context = accessError ? null : parseAccessContext(access, data.user.id);
  if (!context || context.status !== "active" || context.roles.length === 0) {
    await supabase.auth.signOut({ scope: "local" });
    return {
      error:
        "Your account does not have access. Contact your school administrator.",
    };
  }
  redirect("/dashboard");
}

export async function signOut(): Promise<AuthResult> {
  if (!getPublicEnvironment()) redirect("/login");
  const supabase = await createServerSupabaseClient(true);
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error)
    return { error: "Sign-out could not be completed. Please try again." };
  redirect("/login");
}
