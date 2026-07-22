const encoder = new TextEncoder();

/**
 * Deterministic, one-way hash used to store a compact fingerprint of a
 * secret value (a session/invite token, an IP+UA pair) instead of the raw
 * value itself. Used by token revocation and access rate limiting so the
 * database never holds anything that could be replayed as a credential.
 */
export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
