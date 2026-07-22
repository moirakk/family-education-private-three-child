import "server-only";

import { sha256Hex } from "@/lib/crypto-hash";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

/**
 * Supabase-backed rate limiting for the `/api/access` code-submission
 * endpoint. Replaces the previous in-memory `Map`, which reset per
 * serverless/edge instance and therefore did not actually bound the number
 * of guesses an attacker could make against a small, fixed set of access
 * codes once traffic was spread across multiple instances.
 *
 * This is intentionally simple (a single row per fingerprint, updated in
 * place) rather than a sliding-window log: for a private, single-family app
 * the goal is "stop trivial brute force", not precise rate accounting.
 */

const maxAttempts = 8;
const windowMs = 10 * 60 * 1000;

export type AttemptCheck = {
  limited: boolean;
  count: number;
};

function fingerprintKey(ip: string, userAgent: string) {
  return `${ip}:${userAgent.slice(0, 120)}`;
}

/**
 * Reads the current attempt count for this fingerprint without recording a
 * new attempt. Fails open (not limited) on Supabase errors so an outage
 * degrades to "no rate limiting" rather than locking everyone out.
 */
export async function checkAccessAttempts(ip: string, userAgent: string): Promise<AttemptCheck> {
  try {
    const supabase = getSupabaseAdminClient();
    const key = await sha256Hex(fingerprintKey(ip, userAgent));
    const { data, error } = await supabase
      .from("access_attempts")
      .select("attempt_count,window_reset_at")
      .eq("fingerprint", key)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data || new Date(data.window_reset_at).getTime() < Date.now()) {
      return { limited: false, count: 0 };
    }

    return { limited: data.attempt_count >= maxAttempts, count: data.attempt_count };
  } catch (error) {
    console.error("[access-rate-limit] check failed, allowing request:", error);
    return { limited: false, count: 0 };
  }
}

/**
 * Records a failed access-code attempt, resetting the rolling window if the
 * previous one has expired. Best-effort: errors are logged, not thrown, so a
 * Supabase hiccup never blocks the login flow itself.
 */
export async function recordFailedAccessAttempt(ip: string, userAgent: string): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient();
    const key = await sha256Hex(fingerprintKey(ip, userAgent));
    const nowIso = new Date().toISOString();
    const resetAtIso = new Date(Date.now() + windowMs).toISOString();

    const { data } = await supabase
      .from("access_attempts")
      .select("attempt_count,window_reset_at")
      .eq("fingerprint", key)
      .maybeSingle();

    const isWindowExpired = !data || new Date(data.window_reset_at).getTime() < Date.now();
    const nextCount = isWindowExpired ? 1 : data.attempt_count + 1;

    const { error } = await supabase.from("access_attempts").upsert(
      {
        fingerprint: key,
        attempt_count: nextCount,
        window_reset_at: isWindowExpired ? resetAtIso : data.window_reset_at,
        last_attempt_at: nowIso
      },
      { onConflict: "fingerprint" }
    );

    if (error) throw new Error(error.message);
  } catch (error) {
    console.error("[access-rate-limit] failed to record attempt:", error);
  }
}

/** Clears the attempt counter after a successful access-code submission. */
export async function clearAccessAttempts(ip: string, userAgent: string): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient();
    const key = await sha256Hex(fingerprintKey(ip, userAgent));
    const { error } = await supabase.from("access_attempts").delete().eq("fingerprint", key);
    if (error) throw new Error(error.message);
  } catch (error) {
    console.error("[access-rate-limit] failed to clear attempts:", error);
  }
}
