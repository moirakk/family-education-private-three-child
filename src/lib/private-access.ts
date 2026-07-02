export const accessSessionCookieName = "family_private_session";
export const accessAttemptCookieName = "family_access_attempts";

export type AccessRole = "parent" | "caregiver" | "tutor" | "viewer";

const sessionTtlSeconds = 60 * 60 * 24 * 90;
const encoder = new TextEncoder();

export function getConfiguredAccessCodes() {
  return [
    { role: "parent" as const, code: process.env.PRIVATE_PARENT_ACCESS_CODE || process.env.PRIVATE_ACCESS_CODE },
    { role: "caregiver" as const, code: process.env.PRIVATE_CAREGIVER_ACCESS_CODE },
    { role: "tutor" as const, code: process.env.PRIVATE_TUTOR_ACCESS_CODE },
    { role: "viewer" as const, code: process.env.PRIVATE_VIEWER_ACCESS_CODE }
  ].filter((entry) => Boolean(entry.code?.trim()));
}

export function resolveRoleByCode(code: string | null): AccessRole | null {
  if (!code) return null;
  return getConfiguredAccessCodes().find((entry) => entry.code === code)?.role ?? null;
}

export function getPrivateSessionTtlSeconds() {
  return sessionTtlSeconds;
}

export function isParentAutoAccessEnabled() {
  return (process.env.PRIVATE_PARENT_ACCESS_MODE ?? "open") !== "code";
}

function getSessionSecret() {
  const secret = process.env.PRIVATE_SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("PRIVATE_SESSION_SECRET must be set to at least 32 characters in production.");
  }

  return "local-development-insecure-session-secret-do-not-use-in-production";
}

function toBase64Url(bytes: ArrayBuffer) {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function signSessionPayload(payload: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(getSessionSecret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toBase64Url(signature);
}

function timingSafeEqual(a: string | undefined, b: string) {
  const left = encoder.encode(a ?? "");
  const right = encoder.encode(b);
  const length = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;

  for (let index = 0; index < length; index++) {
    diff |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }

  return diff === 0;
}

export async function createAccessSession(role: AccessRole) {
  const expiresAt = Math.floor(Date.now() / 1000) + sessionTtlSeconds;
  const payload = `${role}.${expiresAt}`;
  const signature = await signSessionPayload(payload);
  return `${payload}.${signature}`;
}

export async function verifyAccessSession(value: string | undefined) {
  if (!value) return null;

  const [role, expiresAtText, signature] = value.split(".");
  if (role !== "parent" && role !== "caregiver" && role !== "tutor" && role !== "viewer") return null;

  const expiresAt = Number(expiresAtText);
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) return null;

  const expectedSignature = await signSessionPayload(`${role}.${expiresAtText}`);
  return timingSafeEqual(signature, expectedSignature) ? role : null;
}
