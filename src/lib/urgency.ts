import { differenceInCalendarDays, parseISO } from "date-fns";
import type { CalendarEvent } from "@/lib/types";

export type Urgency = "critical" | "warning" | "ok" | "past";

export const urgencyOrder: Record<Urgency, number> = {
  critical: 0,
  warning: 1,
  ok: 2,
  past: 3
};

export function getEventUrgency(event: Pick<CalendarEvent, "category" | "startsAt">, today = new Date()): Urgency {
  const days = differenceInCalendarDays(parseISO(event.startsAt), today);

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
