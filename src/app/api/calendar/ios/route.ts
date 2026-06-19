import { buildEducationCalendarIcs } from "@/lib/ics";
import { pilotCalendarEvents, pilotChildren } from "@/lib/pilot-data";
import { getCalendarFeedByToken } from "@/lib/supabase-calendar-feed";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const shouldDownload = url.searchParams.get("download") === "1";
  const token = url.searchParams.get("token");
  const supabaseFeed = token ? await getCalendarFeedByToken(token) : null;

  const ics = buildEducationCalendarIcs({
    events: supabaseFeed?.events ?? pilotCalendarEvents,
    children: supabaseFeed?.children ?? pilotChildren,
    calendarName: "伯仲叔教育日历"
  });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `${shouldDownload ? "attachment" : "inline"}; filename="boyang-zhongyang-shuyang-calendar.ics"`,
      "Cache-Control": "no-store"
    }
  });
}
