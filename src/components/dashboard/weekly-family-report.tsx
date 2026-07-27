"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Copy, Printer, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getChildTheme } from "@/lib/child-theme";
import type { CalendarEvent, Child, EducationGoal, LearningRecord } from "@/lib/types";

export function WeeklyFamilyReport({
  childProfiles,
  events,
  goals,
  records
}: {
  childProfiles: Child[];
  events: CalendarEvent[];
  goals: EducationGoal[];
  records: LearningRecord[];
}) {
  const [copied, setCopied] = useState(false);

  const childSummaries = useMemo(
    () =>
      childProfiles.map((child) => {
        const childEvents = events.filter((event) => event.childIds.includes(child.id));
        const childGoals = goals.filter((goal) => goal.childId === child.id);
        const childRecords = records.filter((record) => record.childId === child.id);
        const minutes = childRecords.reduce((sum, record) => sum + record.durationMinutes, 0);
        const nextGoal = childGoals.sort((a, b) => +new Date(a.targetDate) - +new Date(b.targetDate))[0];

        return {
          child,
          eventCount: childEvents.length,
          recordCount: childRecords.length,
          minutes,
          nextGoal
        };
      }),
    [childProfiles, events, goals, records]
  );

  const reportText = useMemo(() => {
    const lines = [
      "家庭教育周报",
      "",
      `本周事项：${events.length} 个`,
      `学习记录：${records.length} 条`,
      `教育目标：${goals.length} 个`,
      ""
    ];

    childSummaries.forEach(({ child, eventCount, minutes, nextGoal }) => {
      lines.push(`${child.firstName}｜${child.grade}`);
      lines.push(`本周事项：${eventCount} 个`);
      lines.push(`已记录学习：${minutes} 分钟`);
      lines.push(`当前目标：${nextGoal?.title ?? child.focusAreas.join("、")}`);
      lines.push(`关注重点：${child.focusAreas.join("、")}`);
      lines.push("");
    });

    return lines.join("\n");
  }, [childSummaries, events.length, goals.length, records.length]);

  async function copyReport() {
    await navigator.clipboard.writeText(reportText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Card id="weekly-report" className="print:border-0 print:shadow-none">
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-4 w-4 text-primary" />
              本周家庭摘要
            </CardTitle>
            <CardDescription>可复制、打印或存 PDF</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={copyReport}>
              {copied ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? "已复制" : "复制摘要"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              打印 / 存 PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-2xl border border-border/60 bg-secondary/50 p-5 dark:border-white/10 dark:bg-white/[0.05]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-voice text-2xl font-bold leading-snug tracking-tight text-foreground">家庭教育周报</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">本周事项 {events.length}</Badge>
              <Badge variant="secondary">学习记录 {records.length}</Badge>
              <Badge variant="secondary">目标 {goals.length}</Badge>
            </div>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {childSummaries.map(({ child, eventCount, recordCount, minutes, nextGoal }) => {
              const theme = getChildTheme(child);
              return (
                <div key={child.id} className="rounded-2xl border border-white/60 bg-white/60 p-4 shadow-sm shadow-black/[0.03] backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.05]">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium" style={{ ...theme.avatarBgStyle, ...theme.avatarTextStyle }}>
                      {child.firstName.slice(0, 1)}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{child.firstName}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{child.grade}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm">
                    <p>本周事项：{eventCount} 个</p>
                    <p>学习记录：{recordCount} 条 / {minutes} 分钟</p>
                    <p>当前目标：{nextGoal?.title ?? "待补充"}</p>
                    <p className="text-muted-foreground">关注：{child.focusAreas.join("、")}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
