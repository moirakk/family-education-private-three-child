import type { CalendarEvent, Child, EventCategory } from "@/lib/types";

const categoryLabels: Record<EventCategory, string> = {
  school: "学校",
  tutoring: "辅导",
  activity: "活动",
  exam: "测评",
  family: "家庭"
};

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function formatIcsDate(value: string | Date) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function formatIcsDay(value: string | Date) {
  const date = new Date(value);
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
}

function addMinutes(value: string, minutes: number) {
  return new Date(new Date(value).getTime() + minutes * 60 * 1000);
}

export function buildEducationCalendarIcs({
  events,
  children,
  calendarName = "Family Education Calendar"
}: {
  events: CalendarEvent[];
  children: Child[];
  calendarName?: string;
}) {
  const childById = new Map(children.map((child) => [child.id, child.firstName]));
  const now = formatIcsDate(new Date());

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Family Education Dashboard//Private Pilot//CN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    "X-WR-TIMEZONE:Asia/Tokyo"
  ];

  events.forEach((event) => {
    const childNames = event.childIds.map((childId) => childById.get(childId)).filter(Boolean).join("、");
    const category = categoryLabels[event.category];
    const location = event.location.trim();

    const startLine = event.allDay ? `DTSTART;VALUE=DATE:${formatIcsDay(event.startsAt)}` : `DTSTART:${formatIcsDate(event.startsAt)}`;
    const endLine = event.allDay
      ? `DTEND;VALUE=DATE:${formatIcsDay(new Date(new Date(event.startsAt).getTime() + 24 * 60 * 60 * 1000))}`
      : `DTEND:${formatIcsDate(event.endsAt ? event.endsAt : addMinutes(event.startsAt, 60))}`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeIcsText(event.id)}@family-education-dashboard.local`,
      `DTSTAMP:${now}`,
      startLine,
      endLine,
      `SUMMARY:${escapeIcsText(event.title)}`,
      `DESCRIPTION:${escapeIcsText([childNames, category].filter(Boolean).join(" · "))}`,
      `CATEGORIES:${escapeIcsText(category)}`,
      "END:VEVENT"
    );

    if (event.recurrenceRule) {
      lines.splice(lines.length - 1, 0, `RRULE:${event.recurrenceRule}`);
    }

    if (location) {
      lines.splice(lines.length - 2, 0, `LOCATION:${escapeIcsText(location)}`);
    }
  });

  lines.push("END:VCALENDAR");

  return `${lines.join("\r\n")}\r\n`;
}
