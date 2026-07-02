import { NextRequest, NextResponse } from "next/server";
import {
  accessAttemptCookieName,
  accessSessionCookieName,
  createAccessSession,
  getPrivateSessionTtlSeconds,
  resolveRoleByCode
} from "@/lib/private-access";

type AttemptState = {
  count: number;
  resetAt: number;
};

const maxAttempts = 8;
const windowMs = 10 * 60 * 1000;
const serverAttempts = new Map<string, AttemptState>();

function safeNextPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function getClientFingerprint(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const ip = forwardedFor || realIp || "unknown-ip";
  const userAgent = request.headers.get("user-agent")?.slice(0, 120) || "unknown-agent";
  return `${ip}:${userAgent}`;
}

function readServerAttempts(key: string): AttemptState {
  const attempts = serverAttempts.get(key);
  if (!attempts || attempts.resetAt < Date.now()) return { count: 0, resetAt: Date.now() + windowMs };
  return attempts;
}

function writeServerAttempts(key: string, attempts: AttemptState) {
  serverAttempts.set(key, attempts);

  for (const [attemptKey, attemptValue] of serverAttempts) {
    if (attemptValue.resetAt < Date.now()) serverAttempts.delete(attemptKey);
  }
}

function clearServerAttempts(key: string) {
  serverAttempts.delete(key);
}

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
  const attemptKey = getClientFingerprint(request);
  const attempts = readAttempts(request);
  const ipAttempts = readServerAttempts(attemptKey);

  if (attempts.count >= maxAttempts || ipAttempts.count >= maxAttempts) {
    const response = redirectToAccess(request, nextPath, "locked");
    writeAttempts(response, attempts, secure);
    return response;
  }

  const role = resolveRoleByCode(typeof code === "string" ? code : null);
  if (!role || role === "viewer") {
    const response = redirectToAccess(request, nextPath, "invalid");
    writeAttempts(response, { count: attempts.count + 1, resetAt: attempts.resetAt }, secure);
    writeServerAttempts(attemptKey, { count: ipAttempts.count + 1, resetAt: ipAttempts.resetAt });
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
  clearServerAttempts(attemptKey);

  return response;
}
