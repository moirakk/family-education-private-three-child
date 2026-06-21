import { NextRequest, NextResponse } from "next/server";
import {
  accessSessionCookieName,
  getConfiguredAccessCodes,
  resolveRoleByCode,
  verifyAccessSession,
  type AccessRole
} from "@/lib/private-access";

const legacyAccessCookieName = "family_private_access";
const legacyRoleCookieName = "family_private_role";
const dashboardRoles = new Set(["parent", "caregiver"]);
const tutorApiRoles = new Set(["parent", "caregiver", "tutor"]);

function isPublicAsset(pathname: string) {
  return pathname.startsWith("/_next") || pathname === "/favicon.ico";
}

async function getCookieRole(request: NextRequest): Promise<AccessRole | null> {
  const sessionRole = await verifyAccessSession(request.cookies.get(accessSessionCookieName)?.value);
  if (sessionRole) return sessionRole;

  const role = request.cookies.get(legacyRoleCookieName)?.value;
  if (role === "parent" || role === "caregiver" || role === "tutor" || role === "viewer") return role;

  // Backward compatibility for older local sessions that stored the raw access code.
  return resolveRoleByCode(request.cookies.get(legacyAccessCookieName)?.value ?? null);
}

function hasDashboardAccess(role: AccessRole | null) {
  return Boolean(role && dashboardRoles.has(role));
}

function hasPrivateApiAccess(pathname: string, role: AccessRole | null) {
  if (!role) return false;
  if (pathname.startsWith("/api/private/tutor-feedback") || pathname.startsWith("/api/private/tutor-context")) return tutorApiRoles.has(role);
  return dashboardRoles.has(role);
}

export async function middleware(request: NextRequest) {
  const hasAccessConfig = getConfiguredAccessCodes().length > 0;
  const cookieRole = await getCookieRole(request);

  if (!hasAccessConfig || isPublicAsset(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname === "/api/access") {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname === "/api/calendar/ios") {
    const token = request.nextUrl.searchParams.get("token");

    if (token || hasDashboardAccess(cookieRole)) {
      return NextResponse.next();
    }

    return new NextResponse("Calendar feed requires private access.", { status: 401 });
  }

  if (request.nextUrl.pathname.startsWith("/api/private")) {
    if (hasPrivateApiAccess(request.nextUrl.pathname, cookieRole)) {
      return NextResponse.next();
    }

    return new NextResponse("Private API requires an authorized access role.", { status: 403 });
  }

  if (request.nextUrl.pathname === "/tutor-feedback") {
    if (cookieRole && tutorApiRoles.has(cookieRole)) {
      return NextResponse.next();
    }

    const accessUrl = new URL("/access", request.url);
    accessUrl.searchParams.set("next", "/tutor-feedback");
    return NextResponse.redirect(accessUrl);
  }

  if (request.nextUrl.pathname === "/access") {
    if (request.method === "GET" && cookieRole) {
      const requestedNextPath = request.nextUrl.searchParams.get("next") || "/";
      const nextPath = cookieRole === "tutor" ? "/tutor-feedback" : requestedNextPath;
      return NextResponse.redirect(new URL(nextPath.startsWith("/") ? nextPath : "/", request.url));
    }

    return NextResponse.next();
  }

  if (hasDashboardAccess(cookieRole)) {
    return NextResponse.next();
  }

  const accessUrl = new URL("/access", request.url);
  accessUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(accessUrl);
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"]
};
