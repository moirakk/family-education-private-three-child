import { NextRequest, NextResponse } from "next/server";
import {
  accessAttemptCookieName,
  accessSessionCookieName,
  createAccessSession,
  getAccessSessionExpiry,
  getPrivateSessionTtlSeconds,
  resolveRoleByCode,
  tutorInviteCookieName,
  verifyTutorInviteToken
} from "@/lib/private-access";
import { checkAccessAttempts, clearAccessAttempts, recordFailedAccessAttempt } from "@/lib/access-rate-limit";
import { revokeToken } from "@/lib/token-revocation";

type AttemptState = {
  count: number;
  resetAt: number;
};

const maxAttempts = 8;
const windowMs = 10 * 60 * 1000;

function safeNextPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwardedFor || realIp || "unknown-ip";
}

function getClientUserAgent(request: NextRequest) {
  return request.headers.get("user-agent")?.slice(0, 120) || "unknown-agent";
}

// Per-cookie counter kept as a fast, no-network first layer (useful even
// when Supabase is briefly unreachable). The authoritative limit -- the one
// that actually holds across serverless/edge instances -- is the Supabase
// `access_attempts` table checked via `checkAccessAttempts` below.
function readAttempts(request: NextRequest): AttemptState {
  const raw = request.cookies.get(accessAttemptCookieName)?.value;
  if (!raw) return { count: 0, resetAt: Date.now() + windowMs };

  try {
    const parsed = JSON.parse(atob(raw)) as Partial<AttemptState>;
    if (typeof parsed.count !== "number" || typeof parsed.resetAt !== "number") throw new Error("Invalid attempt cookie");
    if (parsed.resetAt < Date.now()) return { count: 0, resetAt: Date.now() + windowMs };
    return { count: parsed.count, resetAt: parsed.resetAt };
  } catch {
    return { count: 0, resetAt: Date.now() + windowMs };
  }
}

function writeAttempts(response: NextResponse, attempts: AttemptState, secure: boolean) {
  response.cookies.set(accessAttemptCookieName, btoa(JSON.stringify(attempts)), {
    httpOnly: true,
    sameSite: "strict",
    secure,
    maxAge: Math.ceil((attempts.resetAt - Date.now()) / 1000),
    path: "/access"
  });
}

function clearAttempts(response: NextResponse, secure: boolean) {
  response.cookies.set(accessAttemptCookieName, "", {
    httpOnly: true,
    sameSite: "strict",
    secure,
    maxAge: 0,
    path: "/access"
  });
}

function redirectToAccess(request: NextRequest, nextPath: string, reason: "invalid" | "locked") {
  const url = new URL("/access", request.url);
  url.searchParams.set("next", nextPath);
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}

export function GET(request: NextRequest) {
  const url = new URL("/access", request.url);
  url.searchParams.set("next", "/");
  return NextResponse.redirect(url);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const code = formData.get("code");
  const nextPath = safeNextPath(formData.get("next"));
  const secure = request.nextUrl.protocol === "https:";
  const ip = getClientIp(request);
  const userAgent = getClientUserAgent(request);
  const attempts = readAttempts(request);
  const sharedAttempts = await checkAccessAttempts(ip, userAgent);

  if (attempts.count >= maxAttempts || sharedAttempts.limited) {
    const response = redirectToAccess(request, nextPath, "locked");
    writeAttempts(response, attempts, secure);
    return response;
  }

  const role = resolveRoleByCode(typeof code === "string" ? code : null);
  if (!role || role === "viewer") {
    const response = redirectToAccess(request, nextPath, "invalid");
    writeAttempts(response, { count: attempts.count + 1, resetAt: attempts.resetAt }, secure);
    await recordFailedAccessAttempt(ip, userAgent);
    return response;
  }

  const redirectPath = role === "tutor" ? "/tutor-feedback" : nextPath;
  const response = NextResponse.redirect(new URL(redirectPath, request.url));
  const session = await createAccessSession(role);

  response.cookies.set(accessSessionCookieName, session, {
    httpOnly: true,
    sameSite: "strict",
    secure,
    maxAge: getPrivateSessionTtlSeconds(),
    path: "/"
  });
  clearAttempts(response, secure);
  await clearAccessAttempts(ip, userAgent);

  return response;
}

/**
 * Logout: revokes the current session (and tutor invite, if present) via
 * the shared revocation table so the token cannot be replayed even if the
 * browser cookie is somehow retained, then clears the cookies locally.
 */
export async function DELETE(request: NextRequest) {
  const secure = request.nextUrl.protocol === "https:";
  const sessionToken = request.cookies.get(accessSessionCookieName)?.value;
  const tutorInviteToken = request.cookies.get(tutorInviteCookieName)?.value;

  await Promise.all([
    (async () => {
      if (!sessionToken) return;
      const expiresAt = getAccessSessionExpiry(sessionToken);
      if (expiresAt) await revokeToken(sessionToken, expiresAt, "logout").catch((error) => console.error("[access] failed to revoke session:", error));
    })(),
    (async () => {
      if (!tutorInviteToken) return;
      const scope = await verifyTutorInviteToken(tutorInviteToken);
      if (scope) await revokeToken(tutorInviteToken, scope.expiresAt, "logout").catch((error) => console.error("[access] failed to revoke tutor invite:", error));
    })()
  ]);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(accessSessionCookieName, "", { httpOnly: true, sameSite: "strict", secure, maxAge: 0, path: "/" });
  response.cookies.set(tutorInviteCookieName, "", { httpOnly: true, sameSite: "strict", secure, maxAge: 0, path: "/" });
  return response;
}
