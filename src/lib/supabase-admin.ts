import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export function assertPrivateWriteConfigured() {
  if (!process.env.PRIVATE_ACCESS_CODE) {
    throw new Error("PRIVATE_ACCESS_CODE is required before enabling no-login private writes.");
  }

  if (!process.env.NEXT_PUBLIC_PRIVATE_FAMILY_ID) {
    throw new Error("NEXT_PUBLIC_PRIVATE_FAMILY_ID is required before enabling no-login private writes.");
  }
}
