import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client for local development when DEV_AUTH_BYPASS is
 * enabled. The service-role key must never use a NEXT_PUBLIC_ prefix.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SECRET_KEY (preferred) or SUPABASE_SERVICE_ROLE_KEY is missing. In Supabase API settings use a Secret key (sb_secret_...) or the legacy service_role key, add it to .env.local, and restart npm run dev."
    );
  }

  if (serviceRoleKey.startsWith("sb_publishable_")) {
    throw new Error(
      "The admin secret variable contains a publishable key. Use a Supabase Secret key (sb_secret_...) instead, then restart npm run dev."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
