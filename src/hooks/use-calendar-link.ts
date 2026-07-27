"use client";

import { useEffect } from "react";
import { usePrivateSWR } from "./use-private-swr";

export type CalendarLink = {
  httpsUrl: string;
  webcalUrl: string;
};

export function useCalendarLink() {
  const { data, error } = usePrivateSWR<CalendarLink>("/api/private/calendar-link");

  useEffect(() => {
    if (error) {
      console.error("Failed to load calendar link:", error);
    }
  }, [error]);

  return {
    calendarLink: data ?? null,
    calendarLinkError: error ? "日历链接读取失败，请刷新重试。" : ""
  };
}
