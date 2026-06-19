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

function addMinutes(value: string, minutes: number) {
  return new Date(new Date(value).getTime() + minutes * 60 * 1000);
}

export function buildEducationCalendarIcs({
  events,
  children,
  calendarName = "伯仲叔教育日历"
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

    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeIcsText(event.id)}@family-education-dashboard.local`,
      `DTSTAMP:${now}`,
      `DTSTART:${formatIcsDate(event.startsAt)}`,
      `DTEND:${formatIcsDate(event.endsAt ? event.endsAt : addMinutes(event.startsAt, 45))}`,
      `SUMMARY:${escapeIcsText(event.title)}`,
      `DESCRIPTION:${escapeIcsText([childNames, category].filter(Boolean).join(" · "))}`,
      `LOCATION:${escapeIcsText(event.location)}`,
      `CATEGORIES:${escapeIcsText(category)}`,
      "END:VEVENT"
    );
  });

  lines.push("END:VCALENDAR");

  return `${lines.join("\r\n")}\r\n`;
}
