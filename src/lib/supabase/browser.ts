"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getPublicEnvironment } from "@/lib/env";
import type { Database } from "@/types/database";

export function createBrowserSupabaseClient() {
  const env = getPublicEnvironment();
  if (!env)
    throw new Error("Supabase public configuration is missing or invalid.");
  return createBrowserClient<Database>(env.url, env.publishableKey);
}
