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

function safeNextPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
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
    sameSite: "lax",
    secure,
    maxAge: Math.ceil((attempts.resetAt - Date.now()) / 1000),
    path: "/access"
  });
}

function clearAttempts(response: NextResponse, secure: boolean) {
  response.cookies.set(accessAttemptCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
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

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const code = formData.get("code");
  const nextPath = safeNextPath(formData.get("next"));
  const secure = request.nextUrl.protocol === "https:";
  const attempts = readAttempts(request);

  if (attempts.count >= maxAttempts) {
    const response = redirectToAccess(request, nextPath, "locked");
    writeAttempts(response, attempts, secure);
    return response;
  }

  const role = resolveRoleByCode(typeof code === "string" ? code : null);
  if (!role || role === "viewer") {
    const response = redirectToAccess(request, nextPath, "invalid");
    writeAttempts(response, { count: attempts.count + 1, resetAt: attempts.resetAt }, secure);
    return response;
  }

  const redirectPath = role === "tutor" ? "/tutor-feedback" : nextPath;
  const response = NextResponse.redirect(new URL(redirectPath, request.url));
  const session = await createAccessSession(role);

  response.cookies.set(accessSessionCookieName, session, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge: getPrivateSessionTtlSeconds(),
    path: "/"
  });
  clearAttempts(response, secure);

  return response;
}
