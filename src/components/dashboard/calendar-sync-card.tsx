"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, CheckCircle2, Copy, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCalendarLink } from "@/hooks/use-calendar-link";
import { buildEducationCalendarIcs } from "@/lib/ics";
import type { CalendarEvent, Child } from "@/lib/types";

export function CalendarSyncCard({
  currentEvents,
  childProfiles
}: {
  currentEvents: CalendarEvent[];
  childProfiles: Child[];
}) {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const { calendarLink, calendarLinkError } = useCalendarLink();

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const httpsFeedUrl = useMemo(() => calendarLink?.httpsUrl ?? (origin ? `${origin}/api/calendar/ios` : "/api/calendar/ios"), [calendarLink, origin]);
  const webcalUrl = useMemo(() => httpsFeedUrl.replace(/^https?:\/\//, "webcal://"), [httpsFeedUrl]);

  async function copyFeedUrl() {
    await navigator.clipboard.writeText(webcalUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  function downloadCurrentIcs() {
    const ics = buildEducationCalendarIcs({
      events: currentEvents,
      children: childProfiles,
      calendarName: "Family Education Calendar"
    });
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "boyang-zhongyang-shuyang-current-calendar.ics";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card id="calendar-sync">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-primary" />
          iOS 日历同步
        </CardTitle>
        <CardDescription>
          订阅后，新增日程会自动出现在 iPhone / Mac 日历里。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-2xl border border-border/60 bg-secondary/50 p-5 dark:border-white/10 dark:bg-white/[0.05]">
          <div className="grid gap-2 text-sm leading-relaxed text-muted-foreground">
            <p>1. 点「打开订阅」，在 iOS 日历确认订阅。</p>
            <p>2. 或复制链接，在日历 App 手动添加订阅。</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild>
              <a href={webcalUrl}>
                <CalendarCheck className="mr-2 h-4 w-4" />
                打开订阅
              </a>
            </Button>
            <Button variant="ghost" onClick={copyFeedUrl}>
              {copied ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? "已复制" : "复制订阅链接"}
            </Button>
            <Button variant="outline" onClick={downloadCurrentIcs}>
              <Download className="mr-2 h-4 w-4" />
              下载日历文件
            </Button>
          </div>
          {calendarLinkError ? <p className="mt-3 text-xs text-red-600">{calendarLinkError}</p> : null}
          <p className="mt-4 break-all rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground ring-1 ring-border">{webcalUrl}</p>
        </div>
      </CardContent>
    </Card>
  );
}
