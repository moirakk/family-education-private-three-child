/**
 * Test double for "@/lib/supabase-admin" (swapped in via
 * tests/helpers/register-hooks.ts). Backs the token-revocation lookups in
 * middleware with an in-memory client (defaults to "no tokens revoked").
 */
import { createMockSupabaseState, type QueryHandler } from "./mock-supabase.ts";

let adminQueryHandler: QueryHandler | null = null;

export function setAdminQueryHandler(handler: QueryHandler | null) {
  adminQueryHandler = handler;
}

export function getSupabaseAdminClient() {
  return createMockSupabaseState((call) => adminQueryHandler?.(call) ?? undefined).client;
}

export function assertPrivateWriteConfigured() {
  // No-op in tests: env plumbing is covered by the real module, and these
  // authorization tests focus on role checks, not env validation.
}
