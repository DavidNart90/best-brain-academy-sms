"use server";

import { revalidatePath } from "next/cache";
import { requireActiveAccount } from "@/lib/auth/access";
import { consumeAuthenticatedRateLimit } from "@/lib/security/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { accountProfileSchema } from "../schemas";

export type ProfileActionResult = {
  ok: boolean;
  message: string;
};

export async function saveOwnProfile(
  input: unknown,
): Promise<ProfileActionResult> {
  await requireActiveAccount();
  const parsed = accountProfileSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ??
        "Review your profile details and try again.",
    };

  const limit = await consumeAuthenticatedRateLimit("profile-write");
  if (limit.status === "unavailable")
    return {
      ok: false,
      message: "Profile changes are temporarily unavailable. Please try again.",
    };
  if (limit.status === "denied")
    return {
      ok: false,
      message: `Too many changes. Try again in ${limit.retryAfter} seconds.`,
    };

  const supabase = await createServerSupabaseClient();
  const result = await supabase.rpc("update_own_profile", {
    profile_display_name: parsed.data.displayName,
    profile_phone: parsed.data.phone,
  });

  if (result.error)
    return {
      ok: false,
      message:
        result.error.code === "42501"
          ? "Your session no longer permits profile changes."
          : "Your profile could not be updated. Please try again.",
    };

  revalidatePath("/", "layout");
  revalidatePath("/settings/profile");
  return { ok: true, message: "Profile updated." };
}
