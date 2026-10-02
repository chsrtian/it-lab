import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Single browser Supabase client for the whole app. Created lazily so a
 * missing or invalid configuration surfaces as a friendly auth state
 * instead of a crash at module import time.
 */
let client: SupabaseClient | null = null;
let clientFailed = false;

function readConfig(): { url: string; key: string } {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? "";
  const key =
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() ?? "";
  return { url, key };
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = readConfig();
  return url.length > 0 && key.length > 0;
}

export function getSupabaseClient(): SupabaseClient | null {
  if (client || clientFailed) return client;
  const { url, key } = readConfig();
  if (!url || !key) return null;
  try {
    client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return client;
  } catch {
    clientFailed = true;
    return null;
  }
}
