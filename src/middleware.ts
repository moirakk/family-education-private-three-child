import { NextRequest, NextResponse } from "next/server";
import {
  accessSessionCookieName,
  createAccessSession,
  getConfiguredAccessCodes,
  getPrivateSessionTtlSeconds,
  getTutorInviteTtlSeconds,
  isParentAutoAccessEnabled,
  resolveRoleByCode,
  tutorInviteCookieName,
  verifyAccessSession,
  verifyParentInviteToken,
  verifyTutorInviteToken,
  type TutorInviteScope,
  type AccessRole
} from "@/lib/private-access";
import { isTokenRevoked } from "@/lib/token-revocation";

const dashboardRoles = new Set(["parent", "caregiver"]);
const tutorApiRoles = new Set(["parent", "caregiver", "tutor"]);

function isPublicAsset(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/icon" ||
    pathname === "/apple-icon" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/api/health"
  );
}

async function getCookieRole(request: NextRequest): Promise<AccessRole | null> {
  const sessionToken = request.cookies.get(accessSessionCookieName)?.value;
  const role = await verifyAccessSession(sessionToken);
  if (!role) return null;
  if (sessionToken && (await isTokenRevoked(sessionToken))) return null;
  return role;
}

async function getCookieTutorScope(request: NextRequest): Promise<TutorInviteScope | null> {
  const inviteToken = request.cookies.get(tutorInviteCookieName)?.value;
  const scope = await verifyTutorInviteToken(inviteToken);
  if (!scope) return null;
  if (inviteToken && (await isTokenRevoked(inviteToken))) return null;
  return scope;
}

function hasDashboardAccess(role: AccessRole | null) {
  return Boolean(role && dashboardRoles.has(role));
}

function hasPrivateApiAccess(pathname: string, method: string, role: AccessRole | null, tutorScope: TutorInviteScope | null) {
  if (!role) return false;
  if (dashboardRoles.has(role)) return true;

  if (role === "tutor" && tutorScope) {
    if (pathname === "/api/private/tutor-context") return method === "GET";
    if (pathname === "/api/private/tutor-feedback") return method === "POST";
  }

  return false;
}

function nextWithAccessRole(request: NextRequest, role: AccessRole | null, tutorScope: TutorInviteScope | null = null) {
  const headers = new Headers(request.headers);
  if (role) headers.set("x-family-access-role", role);
  else headers.delete("x-family-access-role");
  headers.delete("x-family-tutor-child-id");
  headers.delete("x-family-tutor-name");
  headers.delete("x-family-tutor-subject");
  if (tutorScope) {
    headers.set("x-family-tutor-child-id", tutorScope.childId);
    headers.set("x-family-tutor-name", encodeURIComponent(tutorScope.tutorName));
    headers.set("x-family-tutor-subject", encodeURIComponent(tutorScope.subject));
  }
  return NextResponse.next({ request: { headers } });
}

async function setAccessSessionCookie(request: NextRequest, response: NextResponse, role: AccessRole) {
  const session = await createAccessSession(role);

  response.cookies.set(accessSessionCookieName, session, {
    httpOnly: true,
    sameSite: "strict",
    secure: request.nextUrl.protocol === "https:",
    maxAge: getPrivateSessionTtlSeconds(),
    path: "/"
  });

  return response;
}

async function nextWithIssuedRole(request: NextRequest, role: AccessRole) {
  return setAccessSessionCookie(request, nextWithAccessRole(request, role), role);
}

async function redirectWithIssuedRole(request: NextRequest, pathname: string, role: AccessRole) {
  return setAccessSessionCookie(request, NextResponse.redirect(new URL(pathname, request.url)), role);
}

async function redirectWithParentInvite(request: NextRequest) {
  const cleanUrl = request.nextUrl.clone();
  cleanUrl.searchParams.delete("family");
  return setAccessSessionCookie(request, NextResponse.redirect(cleanUrl), "parent");
}

async function redirectWithTutorInvite(
  request: NextRequest,
  inviteToken: string,
  scope: TutorInviteScope,
  currentRole: AccessRole | null
) {
  const response = NextResponse.redirect(new URL("/tutor-feedback", request.url));
  response.cookies.set(tutorInviteCookieName, inviteToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: request.nextUrl.protocol === "https:",
    maxAge: Math.min(getTutorInviteTtlSeconds(), Math.max(0, scope.expiresAt - Math.floor(Date.now() / 1000))),
    path: "/"
  });

  return hasDashboardAccess(currentRole) ? response : setAccessSessionCookie(request, response, "tutor");
}

function safeRedirectPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function middleware(request: NextRequest) {
  const hasAccessConfig = getConfiguredAccessCodes().length > 0;
  const parentAutoAccess = isParentAutoAccessEnabled();
  const cookieRole = await getCookieRole(request);
  const tutorScope = await getCookieTutorScope(request);

  if (!hasAccessConfig || isPublicAsset(request.nextUrl.pathname)) {
    return nextWithAccessRole(request, cookieRole, tutorScope);
  }

  if (request.nextUrl.pathname === "/api/access") {
    return nextWithAccessRole(request, cookieRole, tutorScope);
  }

  if (
    request.method === "GET" &&
    !request.nextUrl.pathname.startsWith("/api/") &&
    request.nextUrl.pathname !== "/tutor-feedback" &&
    (await verifyParentInviteToken(request.nextUrl.searchParams.get("family") ?? undefined))
  ) {
    return redirectWithParentInvite(request);
  }

  if (request.nextUrl.pathname === "/api/calendar/ios") {
    const token = request.nextUrl.searchParams.get("token");

    if (token || hasDashboardAccess(cookieRole)) {
      return nextWithAccessRole(request, cookieRole, tutorScope);
    }

    return new NextResponse("Calendar feed requires private access.", { status: 401 });
  }

  if (request.nextUrl.pathname.startsWith("/api/private")) {
    if (hasPrivateApiAccess(request.nextUrl.pathname, request.method, cookieRole, tutorScope)) {
      return nextWithAccessRole(request, cookieRole, tutorScope);
    }

    if (parentAutoAccess && !cookieRole) {
      return nextWithIssuedRole(request, "parent");
    }

    return NextResponse.json({ error: "Private API requires an authorized access role." }, { status: 403 });
  }

  if (request.nextUrl.pathname === "/tutor-feedback") {
    const inviteToken = request.nextUrl.searchParams.get("invite");
    const inviteScope = await verifyTutorInviteToken(inviteToken ?? undefined);

    if (inviteToken && inviteScope) {
      return redirectWithTutorInvite(request, inviteToken, inviteScope, cookieRole);
    }

    const linkCode = request.nextUrl.searchParams.get("code") || request.nextUrl.searchParams.get("token");
    const linkRole = resolveRoleByCode(linkCode);

    if (linkRole === "tutor" && tutorScope) {
      return redirectWithIssuedRole(request, "/tutor-feedback", "tutor");
    }

    if (cookieRole && tutorApiRoles.has(cookieRole) && (cookieRole !== "tutor" || tutorScope)) {
      return nextWithAccessRole(request, cookieRole, tutorScope);
    }

    const accessUrl = new URL("/access", request.url);
    accessUrl.searchParams.set("next", "/tutor-feedback");
    return NextResponse.redirect(accessUrl);
  }

  if (request.nextUrl.pathname === "/access") {
    const requestedNextPath = safeRedirectPath(request.nextUrl.searchParams.get("next"));

    if (parentAutoAccess && request.method === "GET" && !cookieRole && requestedNextPath !== "/tutor-feedback") {
      return redirectWithIssuedRole(request, requestedNextPath, "parent");
    }

    if (request.method === "GET" && cookieRole) {
      const nextPath = cookieRole === "tutor" ? "/tutor-feedback" : requestedNextPath;
      return NextResponse.redirect(new URL(nextPath, request.url));
    }

    return nextWithAccessRole(request, cookieRole, tutorScope);
  }

  if (hasDashboardAccess(cookieRole)) {
    return nextWithAccessRole(request, cookieRole, tutorScope);
  }

  if (parentAutoAccess && !cookieRole) {
    return nextWithIssuedRole(request, "parent");
  }

  const accessUrl = new URL("/access", request.url);
  accessUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(accessUrl);
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
  // Token revocation (isTokenRevoked) queries Supabase via
  // @supabase/supabase-js, which relies on Node.js APIs (e.g.
  // `process.version`) not available in the Edge runtime. Node.js
  // middleware is stable as of Next.js 15.5.
  runtime: "nodejs"
};
