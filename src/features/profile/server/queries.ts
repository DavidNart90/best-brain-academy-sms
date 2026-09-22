import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AccountProfile } from "../types";

export async function getOwnProfile(): Promise<AccountProfile> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user)
    throw new Error("Your account profile could not be authenticated.");

  const [profile, account] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name,password_changed_at")
      .eq("id", user.id)
      .single(),
    supabase
      .from("administrator_accounts")
      .select("phone")
      .eq("user_id", user.id)
      .single(),
  ]);

  if (profile.error || account.error)
    throw new Error("Your account profile could not be loaded.");

  return {
    displayName: profile.data.display_name,
    email: user.email ?? "",
    phone: account.data.phone,
    passwordChangedAt: profile.data.password_changed_at,
  };
}
