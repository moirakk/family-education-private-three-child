/**
 * Test double for "@/lib/supabase-user-context" (swapped in via
 * tests/helpers/register-hooks.ts). Records the JWT claims each route would
 * have signed into the RLS-scoped Supabase client, plus every query made by
 * that client, so authorization tests can assert both without a database.
 */
import { createMockSupabaseState, type QueryCall, type QueryHandler, type StorageCall } from "./mock-supabase.ts";

export type MockClaims = { familyId: string; accessRole: string; tutorChildId?: string };
export type SupabaseClientRecord = { claims: MockClaims; queries: QueryCall[]; storageCalls: StorageCall[] };

let queryHandler: QueryHandler | null = null;
export const supabaseClientRecords: SupabaseClientRecord[] = [];

export function setQueryHandler(handler: QueryHandler | null) {
  queryHandler = handler;
}

export function resetMockSupabase() {
  queryHandler = null;
  supabaseClientRecords.length = 0;
}

export async function getSupabaseUserClient(claims: MockClaims) {
  const state = createMockSupabaseState((call) => queryHandler?.(call) ?? undefined);
  supabaseClientRecords.push({ claims, queries: state.queries, storageCalls: state.storageCalls });
  return state.client;
}

export function getSupabaseAnonClient() {
  return createMockSupabaseState((call) => queryHandler?.(call) ?? undefined).client;
}
