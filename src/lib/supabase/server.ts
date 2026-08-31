import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicEnvironment } from "@/lib/env";
import type { Database } from "@/types/database";

export async function createServerSupabaseClient(writable = false) {
  const env = getPublicEnvironment();
  if (!env)
    throw new Error("Supabase public configuration is missing or invalid.");
  const cookieStore = await cookies();
  return createServerClient<Database>(env.url, env.publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        // Proxy owns refresh during rendering; actions must persist cookie writes.
        if (!writable) return;
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options),
        );
      },
    },
  });
}
