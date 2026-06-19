"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, CheckCircle2, Copy, Download, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const httpsFeedUrl = useMemo(() => (origin ? `${origin}/api/calendar/ios` : "/api/calendar/ios"), [origin]);
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
      calendarName: "伯仲叔教育日历"
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
    <Card id="calendar-sync" className="border-white/70 bg-white/85 shadow-sm backdrop-blur">
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-primary" />
              iOS 日历同步
            </CardTitle>
            <CardDescription>
              先支持 Apple Calendar 标准 ICS。明天可先导入，本项目私有部署后可用订阅链接自动同步。
            </CardDescription>
          </div>
          <Badge variant="outline" className="gap-1">
            <CalendarCheck className="h-3 w-3" />
            Apple Calendar Ready
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm font-semibold">明天可用方式</p>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
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
        </div>

        <div className="rounded-lg bg-slate-950 p-4 text-white">
          <p className="text-sm font-semibold">同步策略</p>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            当前页面 ICS 会包含本机新增日程，适合明天导入。订阅链接需要私有部署和 Supabase 后才能做到长期实时更新。
          </p>
          <p className="mt-4 break-all rounded-md bg-white/10 p-3 text-xs text-slate-300">{webcalUrl}</p>
        </div>
      </CardContent>
    </Card>
  );
}
