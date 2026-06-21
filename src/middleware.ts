import { NextRequest, NextResponse } from "next/server";

const accessCookieName = "family_private_access";
const accessRoleCookieName = "family_private_role";
const dashboardRoles = new Set(["parent", "caregiver"]);
const tutorApiRoles = new Set(["parent", "caregiver", "tutor"]);

type AccessRole = "parent" | "caregiver" | "tutor" | "viewer";

function isPublicAsset(pathname: string) {
  return pathname.startsWith("/_next") || pathname === "/favicon.ico";
}

function getConfiguredAccessCodes() {
  return [
    { role: "parent" as const, code: process.env.PRIVATE_PARENT_ACCESS_CODE || process.env.PRIVATE_ACCESS_CODE },
    { role: "caregiver" as const, code: process.env.PRIVATE_CAREGIVER_ACCESS_CODE },
    { role: "tutor" as const, code: process.env.PRIVATE_TUTOR_ACCESS_CODE },
    { role: "viewer" as const, code: process.env.PRIVATE_VIEWER_ACCESS_CODE }
  ].filter((entry) => Boolean(entry.code?.trim()));
}

function resolveRoleByCode(code: string | null): AccessRole | null {
  if (!code) return null;
  return getConfiguredAccessCodes().find((entry) => entry.code === code)?.role ?? null;
}

function getCookieRole(request: NextRequest): AccessRole | null {
  const role = request.cookies.get(accessRoleCookieName)?.value;
  if (role === "parent" || role === "caregiver" || role === "tutor" || role === "viewer") return role;

  // Backward compatibility for older local sessions that stored the raw access code.
  return resolveRoleByCode(request.cookies.get(accessCookieName)?.value ?? null);
}

function hasDashboardAccess(role: AccessRole | null) {
  return Boolean(role && dashboardRoles.has(role));
}

function hasPrivateApiAccess(pathname: string, role: AccessRole | null) {
  if (!role) return false;
  if (pathname.startsWith("/api/private/tutor-feedback") || pathname.startsWith("/api/private/tutor-context")) return tutorApiRoles.has(role);
  return dashboardRoles.has(role);
}

export function middleware(request: NextRequest) {
  const hasAccessConfig = getConfiguredAccessCodes().length > 0;
  const cookieRole = getCookieRole(request);

  if (!hasAccessConfig || isPublicAsset(request.nextUrl.pathname)) {
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
    const submittedCode = request.nextUrl.searchParams.get("code");
    const role = resolveRoleByCode(submittedCode);

    if (role && (hasDashboardAccess(role) || role === "tutor")) {
      const requestedNextPath = request.nextUrl.searchParams.get("next") || "/";
      const nextPath = role === "tutor" ? "/tutor-feedback" : requestedNextPath;
      const redirectUrl = new URL(nextPath.startsWith("/") ? nextPath : "/", request.url);
      const response = NextResponse.redirect(redirectUrl);

      response.cookies.set(accessCookieName, "granted", {
        httpOnly: true,
        sameSite: "lax",
        secure: request.nextUrl.protocol === "https:",
        maxAge: 60 * 60 * 12,
        path: "/"
      });
      response.cookies.set(accessRoleCookieName, role, {
        httpOnly: true,
        sameSite: "lax",
        secure: request.nextUrl.protocol === "https:",
        maxAge: 60 * 60 * 12,
        path: "/"
      });

      return response;
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
