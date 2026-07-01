import type { CalendarEvent } from "./types";

export type Urgency = "critical" | "warning" | "ok" | "past";

export const urgencyOrder: Record<Urgency, number> = {
  critical: 0,
  warning: 1,
  ok: 2,
  past: 3
};

const FAMILY_TIME_ZONE = "Asia/Tokyo";
const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: FAMILY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

function toCalendarDayKey(date: Date) {
  const parts = dayFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function dayKeyToUtcMs(dayKey: string) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function differenceInFamilyCalendarDays(left: Date, right: Date) {
  const leftDayMs = dayKeyToUtcMs(toCalendarDayKey(left));
  const rightDayMs = dayKeyToUtcMs(toCalendarDayKey(right));

  return Math.round((leftDayMs - rightDayMs) / 86_400_000);
}

export function getEventUrgency(event: Pick<CalendarEvent, "category" | "startsAt">, today = new Date()): Urgency {
  const days = differenceInFamilyCalendarDays(new Date(event.startsAt), today);

  if (days < 0) return "past";
  if (days <= 2 && event.category === "exam") return "critical";
  if (days <= 7) return "warning";
  return "ok";
}

export function sortEventsByUrgency<T extends Pick<CalendarEvent, "category" | "startsAt">>(events: T[]) {
  return [...events].sort((a, b) => {
    const urgencyDelta = urgencyOrder[getEventUrgency(a)] - urgencyOrder[getEventUrgency(b)];
    if (urgencyDelta !== 0) return urgencyDelta;
    return +new Date(a.startsAt) - +new Date(b.startsAt);
  });
}
