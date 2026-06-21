import { buildEducationCalendarIcs } from "@/lib/ics";
import { pilotCalendarEvents, pilotChildren } from "@/lib/pilot-data";
import { getCalendarFeedByToken } from "@/lib/supabase-calendar-feed";

export async function GET(request: Request) {
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

    return new Response(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `${shouldDownload ? "attachment" : "inline"}; filename="family-education-calendar.ics"`,
        "Cache-Control": "no-store"
      }
    });
  }

  const ics = buildEducationCalendarIcs({
    events: pilotCalendarEvents,
    children: pilotChildren,
    calendarName: "Family Education Calendar"
  });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `${shouldDownload ? "attachment" : "inline"}; filename="boyang-zhongyang-shuyang-calendar.ics"`,
      "Cache-Control": "no-store"
    }
  });
}
