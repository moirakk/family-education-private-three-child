"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Copy, Download, FileJson, FileText, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDatabaseBackup } from "@/hooks/use-database-backup";
import { buildEducationCalendarIcs } from "@/lib/ics";
import type { CalendarEvent, Child, EducationGoal, LearningRecord, Resource } from "@/lib/types";

type LocalExportData = {
  intake: unknown;
  localEvents: unknown;
  localLearningRecords: unknown;
  materials: unknown;
  selfEvaluations: unknown;
  tutorFeedback: unknown;
};

const localStorageKeys = {
  intake: "family-education-private-intake-v1",
  localEvents: "family-education-private-events-v1",
  localLearningRecords: "family-education-private-learning-records-v1",
  materials: "family-education-private-materials-v1",
  selfEvaluations: "family-education-private-self-evaluations-v1",
  tutorFeedback: "family-education-private-tutor-feedback-v1"
} satisfies Record<keyof LocalExportData, string>;

function readJsonStorage(key: string) {
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function downloadTextFile(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function ExportPreviewCenter({
  childProfiles,
  events,
  goals,
  records,
  resources
}: {
  childProfiles: Child[];
  events: CalendarEvent[];
  goals: EducationGoal[];
  records: LearningRecord[];
  resources: Resource[];
}) {
  const [localData, setLocalData] = useState<LocalExportData>({
    intake: null,
    localEvents: null,
    localLearningRecords: null,
    materials: null,
    selfEvaluations: null,
    tutorFeedback: null
  });
  const [copied, setCopied] = useState<string | null>(null);
  const { databaseBackup, backupStatus } = useDatabaseBackup();

  useEffect(() => {
    setLocalData({
      intake: readJsonStorage(localStorageKeys.intake),
      localEvents: readJsonStorage(localStorageKeys.localEvents),
      localLearningRecords: readJsonStorage(localStorageKeys.localLearningRecords),
      materials: readJsonStorage(localStorageKeys.materials),
      selfEvaluations: readJsonStorage(localStorageKeys.selfEvaluations),
      tutorFeedback: readJsonStorage(localStorageKeys.tutorFeedback)
    });
  }, []);

  const reportText = useMemo(() => {
    const lines = [
      "Family Education Weekly Report",
      "",
      `本周事项：${events.length} 个`,
      `学习记录：${records.length} 条`,
      `教育目标：${goals.length} 个`,
      ""
    ];

    childProfiles.forEach((child) => {
      const childEvents = events.filter((event) => event.childIds.includes(child.id));
      const childRecords = records.filter((record) => record.childId === child.id);
      const childGoals = goals.filter((goal) => goal.childId === child.id);
      const minutes = childRecords.reduce((sum, record) => sum + record.durationMinutes, 0);
      const nextGoal = childGoals.sort((a, b) => +new Date(a.targetDate) - +new Date(b.targetDate))[0];

      lines.push(`${child.firstName}｜${child.grade}`);
      lines.push(`本周事项：${childEvents.length} 个`);
      lines.push(`学习记录：${childRecords.length} 条 / ${minutes} 分钟`);
      lines.push(`当前目标：${nextGoal?.title ?? "待补充"}`);
      lines.push(`关注重点：${child.focusAreas.join("、")}`);
      lines.push("");
    });

    lines.push("下一步：补齐固定课表、重要日期、资料库、自评与家教反馈。");
    return lines.join("\n");
  }, [childProfiles, events, goals, records]);

  const backupJson = useMemo(() => {
    if (databaseBackup) {
      return JSON.stringify(databaseBackup, null, 2);
    }

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      family: "Family Education Management System",
      scope: "private-three-child-pilot",
      children: childProfiles,
      calendarEvents: events,
      learningRecords: records,
      educationGoals: goals,
      resources,
      localData
    };

    return JSON.stringify(payload, null, 2);
  }, [childProfiles, databaseBackup, events, goals, localData, records, resources]);

  const backupModeLabel =
    backupStatus === "database"
      ? "数据库备份已连接"
      : backupStatus === "loading"
        ? "正在读取数据库备份"
        : backupStatus === "failed"
          ? "数据库备份读取失败，当前显示本机备份"
          : "当前显示本机备份";
  const backupDescription =
    backupStatus === "database"
      ? "来自 Supabase PostgreSQL 的全量元数据备份，包含资料库、自评、家教反馈和 Storage 文件路径。"
      : "当前为浏览器本机备份，适合 demo 和离线留档；部署数据库后会自动切换为 Supabase 备份。";
  const backupFileName = databaseBackup ? "family-education-database-backup.json" : "family-education-local-backup.json";

  const calendarIcs = useMemo(
    () =>
      buildEducationCalendarIcs({
        events,
        children: childProfiles,
        calendarName: "Family Education Calendar"
      }),
    [childProfiles, events]
  );

  const nextEvents = useMemo(() => events.slice(0, 5), [events]);

  async function copyText(kind: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1500);
  }

  return (
    <Card id="export-preview" className="border-border bg-card shadow-none">
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              导出效果预览
            </CardTitle>
            <CardDescription>提前看到发给家长、备份数据和导入 iOS 日历后的文件内容。</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{events.length} 个日程</Badge>
            <Badge variant="outline">{records.length} 条学习记录</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="report">
          <TabsList className="flex h-auto flex-wrap justify-start">
            <TabsTrigger value="report">家长周报</TabsTrigger>
            <TabsTrigger value="backup">JSON 备份</TabsTrigger>
            <TabsTrigger value="calendar">iOS 日历</TabsTrigger>
          </TabsList>

          <TabsContent value="report">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-2xl bg-foreground p-4 text-sm leading-6 text-background">
                {reportText}
              </pre>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-sm font-semibold">导出用途</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  适合复制到微信、邮件，或用“打印 / 存 PDF”生成家长会议材料。
                </p>
                <div className="mt-4 grid gap-2">
                  <Button variant="outline" onClick={() => copyText("report", reportText)}>
                    {copied === "report" ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                    {copied === "report" ? "已复制" : "复制周报文本"}
                  </Button>
                  <Button variant="outline" onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" />
                    打印 / 存 PDF
                  </Button>
                  <Button
                    onClick={() => downloadTextFile("boyang-zhongyang-shuyang-weekly-report.txt", reportText, "text/plain;charset=utf-8")}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    下载周报文本
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="backup">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-2xl bg-foreground p-4 text-xs leading-5 text-background">
                {backupJson}
              </pre>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <FileJson className="h-4 w-4 text-primary" />
                  完整备份包
                </p>
                <Badge variant={backupStatus === "database" ? "default" : "secondary"} className="mt-3">
                  {backupModeLabel}
                </Badge>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {backupDescription}
                </p>
                <div className="mt-4 grid gap-2">
                  <Button variant="outline" onClick={() => copyText("backup", backupJson)}>
                    {copied === "backup" ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                    {copied === "backup" ? "已复制" : "复制 JSON"}
                  </Button>
                  <Button onClick={() => downloadTextFile(backupFileName, backupJson, "application/json;charset=utf-8")}>
                    <Download className="mr-2 h-4 w-4" />
                    下载 JSON 备份
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="calendar">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-2xl bg-foreground p-4 text-xs leading-5 text-background">
                {calendarIcs}
              </pre>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-sm font-semibold">导入日历后会显示</p>
                <div className="mt-3 grid gap-2">
                  {nextEvents.map((event) => (
                    <div key={event.id} className="rounded-xl bg-muted/60 p-3">
                      <p className="text-sm font-medium">{event.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDateTime(event.startsAt)} · {event.location || "地点待补充"}
                      </p>
                    </div>
                  ))}
                </div>
                <Button
                  className="mt-4 w-full"
                  onClick={() => downloadTextFile("boyang-zhongyang-shuyang-current-calendar.ics", calendarIcs, "text/calendar;charset=utf-8")}
                >
                  <Download className="mr-2 h-4 w-4" />
                  下载 ICS 日历
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
