"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, CheckCircle2, Copy, Download, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-primary" />
              iOS 日历同步
            </CardTitle>
            <CardDescription>
              先支持 Apple Calendar 标准 ICS。今天可先导入，本项目私有部署后可用订阅链接自动同步。
            </CardDescription>
          </div>
          <Badge variant="outline" className="gap-1 border-border bg-card">
            <CalendarCheck className="h-3 w-3" />
            Apple Calendar Ready
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="rounded-2xl border border-border/60 bg-secondary/50 p-5 dark:border-white/10 dark:bg-white/[0.05]">
          <p className="text-sm font-semibold">今天可用方式</p>
          <div className="mt-3 grid gap-2 text-sm leading-relaxed text-muted-foreground">
            <p>1. 本地演示时，先下载 `.ics` 文件并导入 iPhone / Mac 日历。</p>
            <p>2. 私有 Vercel 部署后，复制订阅链接，在 iOS 日历中添加“订阅日历”。</p>
            <p>3. 后续接 Supabase 后，家长补充的新日程会进入同一个订阅源。</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <a href="/api/calendar/ios?download=1">
                <Download className="mr-2 h-4 w-4" />
                下载服务器 ICS
              </a>
            </Button>
            <Button variant="outline" onClick={downloadCurrentIcs}>
              <Download className="mr-2 h-4 w-4" />
              下载当前页面 ICS
            </Button>
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
          </div>
          {calendarLinkError ? <p className="mt-3 text-xs text-red-600">{calendarLinkError}</p> : null}
        </div>

        <div className="rounded-2xl border border-white/60 bg-white/60 p-4 shadow-sm shadow-black/[0.03] backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.05]">
          <p className="text-sm font-semibold">同步策略</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            当前页面 ICS 会包含本机新增日程，适合今天现场导入。订阅链接需要私有部署和 Supabase 后才能做到长期实时更新。
          </p>
          <p className="mt-4 break-all rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground ring-1 ring-border">{webcalUrl}</p>
        </div>
      </CardContent>
    </Card>
  );
}
