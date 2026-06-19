import { NextRequest, NextResponse } from "next/server";

const accessCookieName = "family_private_access";

function isPublicAsset(pathname: string) {
  return pathname.startsWith("/_next") || pathname === "/favicon.ico";
}

function hasValidAccessCookie(request: NextRequest, accessCode: string) {
  return request.cookies.get(accessCookieName)?.value === accessCode;
}

export function middleware(request: NextRequest) {
  const accessCode = process.env.PRIVATE_ACCESS_CODE;
  const calendarToken = process.env.PRIVATE_CALENDAR_TOKEN;

  if (!accessCode || isPublicAsset(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname === "/api/calendar/ios") {
    const token = request.nextUrl.searchParams.get("token");

    if ((calendarToken && token === calendarToken) || hasValidAccessCookie(request, accessCode)) {
      return NextResponse.next();
    }

    return new NextResponse("Calendar feed requires private access.", { status: 401 });
  }

  if (request.nextUrl.pathname === "/access") {
    const submittedCode = request.nextUrl.searchParams.get("code");

    if (submittedCode === accessCode) {
      const nextPath = request.nextUrl.searchParams.get("next") || "/";
      const redirectUrl = new URL(nextPath.startsWith("/") ? nextPath : "/", request.url);
      const response = NextResponse.redirect(redirectUrl);

      response.cookies.set(accessCookieName, accessCode, {
        httpOnly: true,
        sameSite: "lax",
        secure: request.nextUrl.protocol === "https:",
        maxAge: 60 * 60 * 24 * 30,
        path: "/"
      });

      return response;
    }

    return NextResponse.next();
  }

  if (hasValidAccessCookie(request, accessCode)) {
    return NextResponse.next();
  }

  const accessUrl = new URL("/access", request.url);
  accessUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(accessUrl);
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"]
};
