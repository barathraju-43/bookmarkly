"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseEnv } from "@/lib/supabase/env";

let browserClient: SupabaseClient | null = null;

export function createClient() {
  const env = requireSupabaseEnv();

  browserClient ??= createBrowserClient(env.url, env.anonKey);

  return browserClient;
}
