"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ClipboardList, Copy, Database, Download, Save, Upload } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { isPrivateApiMode, putPrivateApi } from "@/lib/private-api-client";
import type { Child } from "@/lib/types";

type IntakeEntry = {
  school: string;
  weeklySchedule: string;
  importantDates: string;
  currentGoals: string;
  parentConcerns: string;
  notes: string;
};

type IntakeState = Record<string, IntakeEntry>;

const storageKey = "family-education-private-intake-v1";

function createEmptyEntry(): IntakeEntry {
  return {
    school: "",
    weeklySchedule: "",
    importantDates: "",
    currentGoals: "",
    parentConcerns: "",
    notes: ""
  };
}

function buildInitialState(children: Child[]): IntakeState {
  return children.reduce<IntakeState>((state, child) => {
    state[child.id] = createEmptyEntry();
    return state;
  }, {});
}

function completionCount(entry: IntakeEntry) {
  return [entry.school, entry.weeklySchedule, entry.importantDates, entry.currentGoals, entry.parentConcerns].filter((value) => value.trim()).length;
}

export function FamilyIntakeWorkspace({ childProfiles }: { childProfiles: Child[] }) {
  const [intake, setIntake] = useState<IntakeState>(() => buildInitialState(childProfiles));
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [syncStatus, setSyncStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as IntakeState;
      setIntake({ ...buildInitialState(childProfiles), ...parsed });
    } catch {
      setIntake(buildInitialState(childProfiles));
    }
  }, [childProfiles]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(intake));
    setSaved(true);
    const timer = window.setTimeout(() => setSaved(false), 1200);
    return () => window.clearTimeout(timer);
  }, [intake]);

  const shareText = useMemo(() => {
    const childSections = childProfiles.map((child) => {
      const entry = intake[child.id] ?? createEmptyEntry();
      return [
        `${child.firstName}（${child.grade}）`,
        `学校/班级：${entry.school || "待补充"}`,
        `固定安排：${entry.weeklySchedule || "待补充"}`,
        `重要日期：${entry.importantDates || "待补充"}`,
        `阶段目标：${entry.currentGoals || child.focusAreas.join("、")}`,
        `家长关注：${entry.parentConcerns || "待补充"}`
      ].join("\n");
    });

    return ["Family Education Weekly Report Framework", "", ...childSections.map((section) => `${section}\n`)].join("\n");
  }, [childProfiles, intake]);

  function updateEntry(childId: string, key: keyof IntakeEntry, value: string) {
    setIntake((current) => ({
      ...current,
      [childId]: {
        ...(current[childId] ?? createEmptyEntry()),
        [key]: value
      }
    }));
  }

  async function copyShareText() {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  function exportIntake() {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      family: "Family Education Management System",
      children: childProfiles.map((child) => ({
        id: child.id,
        name: child.firstName,
        grade: child.grade
      })),
      intake
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "boyang-zhongyang-shuyang-intake.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importIntake(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    const payload = JSON.parse(text) as { intake?: IntakeState };
    if (!payload.intake) return;
    setIntake({ ...buildInitialState(childProfiles), ...payload.intake });
  }

  async function syncIntakeToDatabase() {
    if (!isPrivateApiMode()) {
      setSyncStatus("当前是本机模式。部署时设置 NEXT_PUBLIC_FAMILY_DATA_MODE=private-api 后可同步数据库。");
      return;
    }

    try {
      setSyncStatus("正在同步到数据库...");
      await Promise.all(
        childProfiles.map((child) => {
          const entry = intake[child.id] ?? createEmptyEntry();
          return putPrivateApi("/api/private/intake", {
            childId: child.id,
            schoolDetail: entry.school,
            weeklySchedule: entry.weeklySchedule,
            importantDates: entry.importantDates,
            currentGoals: entry.currentGoals,
            parentConcerns: entry.parentConcerns,
            privateNotes: entry.notes
          });
        })
      );
      setSyncStatus("已同步到数据库。");
    } catch (error) {
      setSyncStatus(error instanceof Error ? `数据库同步失败：${error.message}` : "数据库同步失败。");
    }
  }

  return (
    <Card id="intake" className="border-white/70 bg-white/85 shadow-sm backdrop-blur">
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              家长现场补充工作台
            </CardTitle>
            <CardDescription>
              框架已经搭好，今天和家长见面时直接补学校、固定课表、重要日期和关注点。
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1">
              <Save className="h-3 w-3" />
              {saved ? "已自动保存" : "本机浏览器保存"}
            </Badge>
            <Button variant="outline" size="sm" onClick={exportIntake}>
              <Download className="mr-2 h-4 w-4" />
              导出资料
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              导入资料
            </Button>
            <Button variant="outline" size="sm" onClick={syncIntakeToDatabase}>
              <Database className="mr-2 h-4 w-4" />
              同步数据库
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(event) => {
                void importIntake(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
            <Button variant="outline" size="sm" onClick={copyShareText}>
              {copied ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? "已复制" : "复制周报框架"}
            </Button>
          </div>
        </div>
        {syncStatus && <p className="mt-3 text-xs text-muted-foreground">{syncStatus}</p>}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={childProfiles[0]?.id} className="grid gap-4 xl:grid-cols-[280px_1fr]">
          <TabsList className="flex h-auto flex-col items-stretch justify-start gap-2 bg-transparent p-0">
            {childProfiles.map((child) => {
              const entry = intake[child.id] ?? createEmptyEntry();
              const completed = completionCount(entry);

              return (
                <TabsTrigger
                  key={child.id}
                  value={child.id}
                  className="h-auto justify-start rounded-lg border bg-white p-3 text-left data-[state=active]:border-primary data-[state=active]:shadow-sm"
                >
                  <span className="flex w-full items-center gap-3">
                    <Avatar>
                      <AvatarFallback style={{ backgroundColor: child.avatarColor }}>{child.firstName.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-950">{child.firstName}</span>
                      <span className="mt-1 block truncate text-xs text-muted-foreground">{child.grade}</span>
                    </span>
                    <Badge variant={completed >= 4 ? "default" : "outline"}>{completed}/5</Badge>
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {childProfiles.map((child) => {
            const entry = intake[child.id] ?? createEmptyEntry();

            return (
              <TabsContent key={child.id} value={child.id} className="mt-0">
                <div className="rounded-lg border bg-white p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold">{child.firstName} 信息补充</p>
                      <p className="mt-1 text-xs text-muted-foreground">{child.grade}</p>
                    </div>
                    <Badge variant="secondary">自动保存</Badge>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor={`${child.id}-school`}>学校 / 班级 / 课程体系</Label>
                      <Input
                        id={`${child.id}-school`}
                        placeholder="今天现场补充"
                        value={entry.school}
                        onChange={(event) => updateEntry(child.id, "school", event.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`${child.id}-goals`}>阶段目标</Label>
                      <Input
                        id={`${child.id}-goals`}
                        placeholder={child.focusAreas.join(" / ")}
                        value={entry.currentGoals}
                        onChange={(event) => updateEntry(child.id, "currentGoals", event.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`${child.id}-schedule`}>固定周课表</Label>
                      <Textarea
                        id={`${child.id}-schedule`}
                        className="min-h-28"
                        placeholder="例如：周一数学，周三英文，周六运动..."
                        value={entry.weeklySchedule}
                        onChange={(event) => updateEntry(child.id, "weeklySchedule", event.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`${child.id}-dates`}>近期重要日期</Label>
                      <Textarea
                        id={`${child.id}-dates`}
                        className="min-h-28"
                        placeholder="考试、报名、面试、活动、假期安排..."
                        value={entry.importantDates}
                        onChange={(event) => updateEntry(child.id, "importantDates", event.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5 lg:col-span-2">
                      <Label htmlFor={`${child.id}-concerns`}>家长最关心的问题</Label>
                      <Textarea
                        id={`${child.id}-concerns`}
                        className="min-h-24"
                        placeholder="作业、成绩、习惯、情绪、升学、时间管理..."
                        value={entry.parentConcerns}
                        onChange={(event) => updateEntry(child.id, "parentConcerns", event.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}
