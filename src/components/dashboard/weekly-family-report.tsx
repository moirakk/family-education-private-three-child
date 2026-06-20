"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Copy, Printer, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      "伯仲叔家庭教育周报",
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

    lines.push("下一步：今天现场补齐固定课表、重要日期和家长关注点。");
    return lines.join("\n");
  }, [childSummaries, events.length, goals.length, records.length]);

  async function copyReport() {
    await navigator.clipboard.writeText(reportText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Card id="weekly-report" className="border-white/70 bg-white/85 shadow-sm backdrop-blur print:shadow-none">
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-4 w-4 text-primary" />
              家长版周报预览
            </CardTitle>
            <CardDescription>
              适合今天现场讲解、截图、打印或复制给家长的只读摘要。
            </CardDescription>
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
        <div className="rounded-lg bg-slate-950 p-5 text-white">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-slate-300">Private Family Education Report</p>
              <h2 className="mt-2 text-2xl font-semibold">伯仲叔家庭教育周报</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">本周事项 {events.length}</Badge>
              <Badge variant="secondary">学习记录 {records.length}</Badge>
              <Badge variant="secondary">目标 {goals.length}</Badge>
            </div>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {childSummaries.map(({ child, eventCount, recordCount, minutes, nextGoal }) => (
              <div key={child.id} className="rounded-lg bg-white/10 p-4">
                <p className="text-sm font-semibold">{child.firstName}</p>
                <p className="mt-1 text-xs text-slate-300">{child.grade}</p>
                <div className="mt-4 grid gap-2 text-sm">
                  <p>本周事项：{eventCount} 个</p>
                  <p>学习记录：{recordCount} 条 / {minutes} 分钟</p>
                  <p>当前目标：{nextGoal?.title ?? "待补充"}</p>
                  <p className="text-slate-300">关注：{child.focusAreas.join("、")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
