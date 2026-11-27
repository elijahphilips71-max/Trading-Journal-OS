import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, supabaseConfigured } from "./env";

/**
 * Service-role client. It skips row-level security, so only use it for Dad's
 * public page, always filter by user_id, and never send its rows to the browser.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseConfigured() || !key) return null;
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
