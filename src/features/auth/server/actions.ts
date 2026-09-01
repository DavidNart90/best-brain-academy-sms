"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPublicEnvironment } from "@/lib/env";
import type { AuthResult } from "@/features/auth/schemas";

export async function signOut(): Promise<AuthResult> {
  if (!getPublicEnvironment()) redirect("/login");
  const supabase = await createServerSupabaseClient(true);
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error)
    return { error: "Sign-out could not be completed. Please try again." };
  redirect("/login");
}
