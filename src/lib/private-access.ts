import { isPrivateApiDataMode } from "./family-data-mode.ts";

export const accessSessionCookieName = "family_private_session";
export const accessAttemptCookieName = "family_access_attempts";
export const tutorInviteCookieName = "family_tutor_invite";

export type AccessRole = "parent" | "caregiver" | "tutor" | "viewer";
export type TutorInviteScope = {
  childId: string;
  tutorName: string;
  subject: string;
  expiresAt: number;
};

// Session tokens are refreshed on every access, so a shorter window limits
// exposure from a stolen device without forcing frequent re-entry of codes.
const sessionTtlSeconds = 60 * 60 * 24 * 30;
// Invite links are shared out-of-band (chat, paper) and are harder to
// rotate on demand, so they get a longer window, capped well under a year.
const tutorInviteTtlSeconds = 60 * 60 * 24 * 90;
const parentInviteTtlSeconds = 60 * 60 * 24 * 90;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Clearly-fake, deliberately different from any real secret so it can never
// be mistaken for (or accidentally match) a production value. Only used
// outside production, and only after printing a loud warning.
const devOnlySessionSecret = "dev-only-insecure-secret-do-not-use-in-prod-0000000000";
let hasWarnedAboutDevSessionSecret = false;

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
  return (process.env.PRIVATE_PARENT_ACCESS_MODE ?? "open") === "unsafe-open";
}

function getSessionSecret() {
  const secret = process.env.PRIVATE_SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;

  // NODE_ENV alone cannot distinguish "deployed" from "next build + next
  // start of the local demo": both run with NODE_ENV=production. Only a
  // production build that actually serves private data (private-api mode)
  // must refuse to run without a real secret.
  if (process.env.NODE_ENV === "production" && isPrivateApiDataMode()) {
    throw new Error("PRIVATE_SESSION_SECRET must be set to at least 32 characters in production.");
  }

  // Local/demo fallback only. This is a fixed, publicly-known value
  // (never treated as a real secret) so it must never be reachable in a
  // private-api production deployment -- the throw above enforces that.
  // We warn loudly instead of failing silently, since a misconfigured
  // environment should be obvious, not a silent security downgrade.
  if (!hasWarnedAboutDevSessionSecret) {
    hasWarnedAboutDevSessionSecret = true;
    console.warn(
      "[private-access] PRIVATE_SESSION_SECRET is not set (or too short). " +
        "Using a dev-only insecure secret. This is unsafe for any deployment " +
        "reachable outside your local machine. Set PRIVATE_SESSION_SECRET " +
        "(>= 32 chars) via `npm run private:secrets`."
    );
  }

  return devOnlySessionSecret;
}

function toBase64Url(bytes: ArrayBuffer) {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64Url(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function encodeJson(value: unknown) {
  return toBase64Url(encoder.encode(JSON.stringify(value)).buffer);
}

function decodeJson<T>(value: string): T | null {
  try {
    return JSON.parse(decoder.decode(fromBase64Url(value))) as T;
  } catch {
    return null;
  }
}

function getTutorInviteSecret() {
  return `${getSessionSecret()}:tutor-invite:${process.env.PRIVATE_TUTOR_ACCESS_CODE?.trim() || "default"}`;
}

function getParentInviteSecret() {
  const parentCode = process.env.PRIVATE_PARENT_ACCESS_CODE || process.env.PRIVATE_ACCESS_CODE;
  return `${getSessionSecret()}:parent-invite:${parentCode?.trim() || "default"}`;
}

async function signPayload(payload: string, secret = getSessionSecret()) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
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
  const signature = await signPayload(payload);
  return `${payload}.${signature}`;
}

export async function verifyAccessSession(value: string | undefined) {
  if (!value) return null;

  const [role, expiresAtText, signature] = value.split(".");
  if (role !== "parent" && role !== "caregiver" && role !== "tutor" && role !== "viewer") return null;

  const expiresAt = Number(expiresAtText);
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) return null;

  const expectedSignature = await signPayload(`${role}.${expiresAtText}`);
  return timingSafeEqual(signature, expectedSignature) ? role : null;
}

/**
 * Reads the `expiresAt` (unix seconds) embedded in a session token without
 * re-verifying its signature. Used only for revocation bookkeeping (e.g. on
 * logout), where the caller already trusts the cookie it just read back
 * from the request -- the actual security check remains `verifyAccessSession`.
 */
export function getAccessSessionExpiry(value: string): number | null {
  const [, expiresAtText] = value.split(".");
  const expiresAt = Number(expiresAtText);
  return Number.isFinite(expiresAt) ? expiresAt : null;
}

export function getTutorInviteTtlSeconds() {
  return tutorInviteTtlSeconds;
}

export async function createParentInviteToken() {
  const payload = encodeJson({ role: "parent", expiresAt: Math.floor(Date.now() / 1000) + parentInviteTtlSeconds });
  const signature = await signPayload(payload, getParentInviteSecret());
  return `${payload}.${signature}`;
}

export async function verifyParentInviteToken(value: string | undefined) {
  if (!value) return false;

  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra) return false;

  const expectedSignature = await signPayload(payload, getParentInviteSecret());
  if (!timingSafeEqual(signature, expectedSignature)) return false;

  const invite = decodeJson<{ role?: unknown; expiresAt?: unknown }>(payload);
  return Boolean(
    invite &&
      invite.role === "parent" &&
      Number.isFinite(invite.expiresAt) &&
      Number(invite.expiresAt) >= Math.floor(Date.now() / 1000)
  );
}

export async function createTutorInviteToken(scope: Omit<TutorInviteScope, "expiresAt">) {
  const payload = encodeJson({
    childId: scope.childId.trim(),
    tutorName: scope.tutorName.trim(),
    subject: scope.subject.trim(),
    expiresAt: Math.floor(Date.now() / 1000) + tutorInviteTtlSeconds
  } satisfies TutorInviteScope);
  const signature = await signPayload(payload, getTutorInviteSecret());
  return `${payload}.${signature}`;
}

export async function verifyTutorInviteToken(value: string | undefined): Promise<TutorInviteScope | null> {
  if (!value) return null;

  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra) return null;

  const expectedSignature = await signPayload(payload, getTutorInviteSecret());
  if (!timingSafeEqual(signature, expectedSignature)) return null;

  const scope = decodeJson<TutorInviteScope>(payload);
  if (
    !scope ||
    typeof scope.childId !== "string" ||
    !scope.childId.trim() ||
    typeof scope.tutorName !== "string" ||
    !scope.tutorName.trim() ||
    typeof scope.subject !== "string" ||
    !scope.subject.trim() ||
    !Number.isFinite(scope.expiresAt) ||
    scope.expiresAt < Math.floor(Date.now() / 1000)
  ) {
    return null;
  }

  return {
    childId: scope.childId.trim(),
    tutorName: scope.tutorName.trim(),
    subject: scope.subject.trim(),
    expiresAt: scope.expiresAt
  };
}
