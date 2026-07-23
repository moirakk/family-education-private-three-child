"use client";

import { usePrivateSWR } from "./use-private-swr";

export type CalendarLink = {
  httpsUrl: string;
  webcalUrl: string;
};

export function useCalendarLink() {
  const { data, error } = usePrivateSWR<CalendarLink>("/api/private/calendar-link");

  return {
    calendarLink: data ?? null,
    calendarLinkError: error ? error.message : ""
  };
}
