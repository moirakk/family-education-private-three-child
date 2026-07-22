import "server-only";

import { sha256Hex } from "@/lib/crypto-hash";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

/**
 * Lightweight, DB-backed single-token revocation for a private family app.
 *
 * We never store the raw token (session/invite tokens are bearer
 * credentials), only a SHA-256 hash, in `public.revoked_tokens`. Revocation
 * checks run on every request through middleware, so to avoid a Supabase
 * round-trip per request we cache the set of currently-revoked hashes in
 * module memory and refresh it at most once per `cacheTtlMs`. Each
 * serverless/edge instance keeps its own cache, so a revocation can take up
 * to `cacheTtlMs` to apply on other warm instances -- acceptable for a
 * single-family deployment, and far better than the previous "no revocation
 * at all" state.
 */

const cacheTtlMs = 60 * 1000;

type RevocationCache = {
  hashes: Set<string>;
  loadedAt: number;
};

let cache: RevocationCache | null = null;

async function loadRevokedHashes(): Promise<Set<string>> {
  const supabase = getSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  // Opportunistic cleanup: this runs at most once per cacheTtlMs across all
  // warm instances, so it is cheap, and keeps the table from growing
  // unbounded without needing a separate scheduled job.
  await supabase.from("revoked_tokens").delete().lt("expires_at", nowIso);

  const { data, error } = await supabase.from("revoked_tokens").select("token_hash").gt("expires_at", nowIso);

  if (error) {
    console.error("[token-revocation] failed to refresh revoked token cache:", error.message);
    return cache?.hashes ?? new Set();
  }

  return new Set((data ?? []).map((row) => row.token_hash as string));
}

async function getRevokedHashes(): Promise<Set<string>> {
  if (cache && Date.now() - cache.loadedAt < cacheTtlMs) return cache.hashes;

  const hashes = await loadRevokedHashes();
  cache = { hashes, loadedAt: Date.now() };
  return hashes;
}

/**
 * Returns true if `token` has been explicitly revoked. Fails open (returns
 * false) on Supabase errors so a transient outage degrades to "revocation
 * checks temporarily unavailable" rather than locking every family member
 * out of a private, low-traffic app.
 */
export async function isTokenRevoked(token: string): Promise<boolean> {
  try {
    const [hashes, tokenHash] = await Promise.all([getRevokedHashes(), sha256Hex(token)]);
    return hashes.has(tokenHash);
  } catch (error) {
    console.error("[token-revocation] revocation check failed, allowing request:", error);
    return false;
  }
}

/**
 * Marks `token` as revoked until its own expiry (`expiresAt`, unix seconds).
 * Storing the token's real expiry means the revoked_tokens table naturally
 * self-prunes once the token would have expired anyway.
 */
export async function revokeToken(token: string, expiresAt: number, reason = "manual") {
  const supabase = getSupabaseAdminClient();
  const tokenHash = await sha256Hex(token);
  const expiresAtIso = new Date(Math.max(expiresAt, Math.floor(Date.now() / 1000) + 60) * 1000).toISOString();

  const { error } = await supabase
    .from("revoked_tokens")
    .upsert({ token_hash: tokenHash, expires_at: expiresAtIso, reason }, { onConflict: "token_hash" });

  if (error) throw new Error(error.message);

  // Make the revocation take effect immediately on this instance instead of
  // waiting for the next cache refresh.
  if (cache) cache.hashes.add(tokenHash);
}
