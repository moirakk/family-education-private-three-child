import type { NextRequest } from "next/server";
import { buildEducationCalendarIcs } from "@/lib/ics";
import { accessSessionCookieName, verifyAccessSession } from "@/lib/private-access";
import { pilotCalendarEvents, pilotChildren } from "@/lib/pilot-data";
import { getCalendarFeedByFamilyId, getCalendarFeedByToken } from "@/lib/supabase-calendar-feed";

function calendarResponse(ics: string, shouldDownload: boolean) {
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `${shouldDownload ? "attachment" : "inline"}; filename="family-education-calendar.ics"`,
      "Cache-Control": "no-store"
    }
  });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const shouldDownload = url.searchParams.get("download") === "1";
  const token = url.searchParams.get("token");

  if (token) {
    const supabaseFeed = await getCalendarFeedByToken(token);

    if (!supabaseFeed) {
      return new Response("Invalid or revoked calendar token.", {
        status: 401,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store"
        }
      });
    }

    const ics = buildEducationCalendarIcs({
      events: supabaseFeed.events,
      children: supabaseFeed.children,
      calendarName: "Family Education Calendar"
    });

    return calendarResponse(ics, shouldDownload);
  }

  const isPrivateApiMode = process.env.NEXT_PUBLIC_FAMILY_DATA_MODE === "private-api";
  const sessionCookie = request.cookies.get(accessSessionCookieName)?.value;
  const session = sessionCookie ? await verifyAccessSession(sessionCookie) : null;

  if (session && session !== "tutor") {
    const familyId = process.env.NEXT_PUBLIC_PRIVATE_FAMILY_ID;
    if (!familyId) {
      return new Response("Private family id is not configured.", {
        status: 500,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store"
        }
      });
    }

    const supabaseFeed = await getCalendarFeedByFamilyId(familyId, session);

    if (!supabaseFeed) {
      return new Response("Calendar feed is unavailable.", {
        status: 500,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store"
        }
      });
    }

    const ics = buildEducationCalendarIcs({
      events: supabaseFeed.events,
      children: supabaseFeed.children,
      calendarName: "Family Education Calendar"
    });

    return calendarResponse(ics, shouldDownload);
  }

  if (isPrivateApiMode) {
    return new Response("Calendar token or private session is required.", {
      status: 401,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  }

  const ics = buildEducationCalendarIcs({
    events: pilotCalendarEvents,
    children: pilotChildren,
    calendarName: "Family Education Calendar"
  });

  return calendarResponse(ics, shouldDownload);
}
