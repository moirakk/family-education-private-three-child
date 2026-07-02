import { NextRequest, NextResponse } from "next/server";
import {
  accessSessionCookieName,
  createAccessSession,
  getConfiguredAccessCodes,
  getPrivateSessionTtlSeconds,
  isParentAutoAccessEnabled,
  resolveRoleByCode,
  verifyAccessSession,
  type AccessRole
} from "@/lib/private-access";

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
  return verifyAccessSession(request.cookies.get(accessSessionCookieName)?.value);
}

function hasDashboardAccess(role: AccessRole | null) {
  return Boolean(role && dashboardRoles.has(role));
}

function hasPrivateApiAccess(pathname: string, method: string, role: AccessRole | null) {
  if (!role) return false;
  if (dashboardRoles.has(role)) return true;

  if (role === "tutor") {
    if (pathname === "/api/private/tutor-context") return method === "GET";
    if (pathname === "/api/private/tutor-feedback") return method === "POST";
  }

  return false;
}

function nextWithAccessRole(request: NextRequest, role: AccessRole | null) {
  const headers = new Headers(request.headers);
  if (role) headers.set("x-family-access-role", role);
  else headers.delete("x-family-access-role");
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

function safeRedirectPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function middleware(request: NextRequest) {
  const hasAccessConfig = getConfiguredAccessCodes().length > 0;
  const parentAutoAccess = isParentAutoAccessEnabled();
  const cookieRole = await getCookieRole(request);

  if (!hasAccessConfig || isPublicAsset(request.nextUrl.pathname)) {
    return nextWithAccessRole(request, cookieRole);
  }

  if (request.nextUrl.pathname === "/api/access") {
    return nextWithAccessRole(request, cookieRole);
  }

  if (request.nextUrl.pathname === "/api/calendar/ios") {
    const token = request.nextUrl.searchParams.get("token");

    if (token || hasDashboardAccess(cookieRole)) {
      return nextWithAccessRole(request, cookieRole);
    }

    return new NextResponse("Calendar feed requires private access.", { status: 401 });
  }

  if (request.nextUrl.pathname.startsWith("/api/private")) {
    if (hasPrivateApiAccess(request.nextUrl.pathname, request.method, cookieRole)) {
      return nextWithAccessRole(request, cookieRole);
    }

    if (parentAutoAccess) {
      return nextWithIssuedRole(request, "parent");
    }

    return NextResponse.json({ error: "Private API requires an authorized access role." }, { status: 403 });
  }

  if (request.nextUrl.pathname === "/tutor-feedback") {
    const linkCode = request.nextUrl.searchParams.get("code") || request.nextUrl.searchParams.get("token");
    const linkRole = resolveRoleByCode(linkCode);

    if (linkRole === "tutor") {
      return redirectWithIssuedRole(request, "/tutor-feedback", "tutor");
    }

    if (cookieRole && tutorApiRoles.has(cookieRole)) {
      return nextWithAccessRole(request, cookieRole);
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

    return nextWithAccessRole(request, cookieRole);
  }

  if (hasDashboardAccess(cookieRole)) {
    return nextWithAccessRole(request, cookieRole);
  }

  if (parentAutoAccess) {
    return nextWithIssuedRole(request, "parent");
  }

  const accessUrl = new URL("/access", request.url);
  accessUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(accessUrl);
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"]
};
