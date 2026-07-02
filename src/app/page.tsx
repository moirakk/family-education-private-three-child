"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AppShell, type DashboardMode } from "@/components/dashboard/app-shell";
import { DailyBrief } from "@/components/dashboard/daily-brief";
import { TodayCommandCenter } from "@/components/dashboard/today-command-center";
import { Button } from "@/components/ui/button";
import type { FamilySnapshot } from "@/lib/core-types";
import { isFamilyDataModeMisconfigured, isPrivateApiMode } from "@/lib/private-api-client";
import { mergeRemoteAndLocal } from "@/lib/reconciled-collection";
import {
  childOperatingPlans,
  pilotCalendarEvents,
  pilotChildren,
  pilotEducationGoals,
  pilotFamilyName,
  pilotLearningRecords,
  pilotResources
} from "@/lib/pilot-data";

function DashboardSectionLoading() {
  return <div className="min-h-32 rounded-2xl border border-border bg-card p-4 shadow-none" />;
}

const CalendarSyncCard = dynamic(() => import("@/components/dashboard/calendar-sync-card").then((mod) => mod.CalendarSyncCard), {
  loading: DashboardSectionLoading
});
const ChildManagement = dynamic(() => import("@/components/dashboard/child-management").then((mod) => mod.ChildManagement), {
  loading: DashboardSectionLoading
});
const ChildProfile = dynamic(() => import("@/components/dashboard/child-profile").then((mod) => mod.ChildProfile), {
  loading: DashboardSectionLoading
});
const EducationRoadmap = dynamic(() => import("@/components/dashboard/education-roadmap").then((mod) => mod.EducationRoadmap), {
  loading: DashboardSectionLoading
});
const ExportPreviewCenter = dynamic(() => import("@/components/dashboard/export-preview-center").then((mod) => mod.ExportPreviewCenter), {
  loading: DashboardSectionLoading
});
const FamilyEventPlanner = dynamic(() => import("@/components/dashboard/family-event-planner").then((mod) => mod.FamilyEventPlanner), {
  loading: DashboardSectionLoading
});
const FamilyIntakeWorkspace = dynamic(() => import("@/components/dashboard/family-intake-workspace").then((mod) => mod.FamilyIntakeWorkspace), {
  loading: DashboardSectionLoading
});
const GrowthSummary = dynamic(() => import("@/components/dashboard/growth-summary").then((mod) => mod.GrowthSummary), {
  loading: DashboardSectionLoading
});
const LearningMaterialsVault = dynamic(() => import("@/components/dashboard/learning-materials-vault").then((mod) => mod.LearningMaterialsVault), {
  loading: DashboardSectionLoading
});
const LearningRecordPlanner = dynamic(() => import("@/components/dashboard/learning-record-planner").then((mod) => mod.LearningRecordPlanner), {
  loading: DashboardSectionLoading
});
const PwaInstallCard = dynamic(() => import("@/components/dashboard/pwa-install-card").then((mod) => mod.PwaInstallCard), {
  loading: DashboardSectionLoading
});
const SelfEvaluationBoard = dynamic(() => import("@/components/dashboard/self-evaluation-board").then((mod) => mod.SelfEvaluationBoard), {
  loading: DashboardSectionLoading
});
const ThreeChildOperatingMatrix = dynamic(() => import("@/components/dashboard/three-child-operating-matrix").then((mod) => mod.ThreeChildOperatingMatrix), {
  loading: DashboardSectionLoading
});
const TutorFeedbackBoard = dynamic(() => import("@/components/dashboard/tutor-feedback-board").then((mod) => mod.TutorFeedbackBoard), {
  loading: DashboardSectionLoading
});
const UnifiedCalendar = dynamic(() => import("@/components/dashboard/unified-calendar").then((mod) => mod.UnifiedCalendar), {
  loading: DashboardSectionLoading
});
const UpcomingEvents = dynamic(() => import("@/components/dashboard/upcoming-events").then((mod) => mod.UpcomingEvents), {
  loading: DashboardSectionLoading
});
const WeeklyFamilyReport = dynamic(() => import("@/components/dashboard/weekly-family-report").then((mod) => mod.WeeklyFamilyReport), {
  loading: DashboardSectionLoading
});
const WeeklyOverview = dynamic(() => import("@/components/dashboard/weekly-overview").then((mod) => mod.WeeklyOverview), {
  loading: DashboardSectionLoading
});

const hashModeMap: Record<string, DashboardMode> = {
  today: "today",
  dashboard: "today",
  week: "week",
  "event-planner": "week",
  calendar: "week",
  "calendar-sync": "week",
  "weekly-report": "week",
  records: "records",
  "learning-records": "records",
  materials: "records",
  "self-evaluation": "records",
  "tutor-feedback": "records",
  children: "records",
  growth: "records",
  roadmap: "records",
  resources: "records",
  more: "more",
  intake: "more",
  "export-preview": "more",
  "deploy-status": "more"
};

function getModeFromHash(hash: string): DashboardMode | null {
  const key = hash.replace(/^#/, "");
  return hashModeMap[key] ?? null;
}

function scrollToDashboardTarget(targetId?: string, attempt = 0) {
  window.requestAnimationFrame(() => {
    const element = targetId ? document.getElementById(targetId) : null;

    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (targetId && attempt < 10) {
      window.setTimeout(() => scrollToDashboardTarget(targetId, attempt + 1), 80);
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

export default function Home() {
  const isMisconfigured = isFamilyDataModeMisconfigured();
  const [managedChildren, setManagedChildren] = useState(pilotChildren);
  const [selectedChildId, setSelectedChildId] = useState(pilotChildren[0].id);
  const [localCalendarEvents, setLocalCalendarEvents] = useState<typeof pilotCalendarEvents>([]);
  const [localLearningRecords, setLocalLearningRecords] = useState<typeof pilotLearningRecords>([]);
  const [roadmapGoals, setRoadmapGoals] = useState<typeof pilotEducationGoals>(pilotEducationGoals);
  const [remoteSnapshot, setRemoteSnapshot] = useState<FamilySnapshot | null>(null);
  const [activeMode, setActiveMode] = useState<DashboardMode>("today");
  const [showTodayMetrics, setShowTodayMetrics] = useState(false);
  const [showWeeklyReview, setShowWeeklyReview] = useState(false);

  function handleModeChange(mode: DashboardMode, targetId?: string) {
    const nextHash = targetId ?? mode;
    setActiveMode(mode);
    window.history.replaceState(null, "", `#${nextHash}`);
    scrollToDashboardTarget(targetId);
  }

  useEffect(() => {
    function syncModeFromHash() {
      const mode = getModeFromHash(window.location.hash);
      if (!mode) return;

      const targetId = window.location.hash.replace(/^#/, "") || undefined;
      setActiveMode(mode);
      scrollToDashboardTarget(targetId);
    }

    syncModeFromHash();
    window.addEventListener("hashchange", syncModeFromHash);
    return () => window.removeEventListener("hashchange", syncModeFromHash);
  }, []);

  useEffect(() => {
    if (!isPrivateApiMode()) return;

    let isMounted = true;
    fetch("/api/private/snapshot")
      .then(async (response) => {
        const payload = (await response.json()) as { data?: FamilySnapshot; error?: string };
        if (!response.ok || !payload.data) throw new Error(payload.error ?? "Load private snapshot failed");
        return payload.data;
      })
      .then((snapshot) => {
        if (!isMounted) return;
        setRemoteSnapshot(snapshot);
        setManagedChildren(snapshot.children.length > 0 ? snapshot.children : pilotChildren);
        setSelectedChildId(snapshot.children[0]?.id ?? pilotChildren[0].id);
      })
      .catch(() => {
        if (!isMounted) return;
        setRemoteSnapshot(null);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedChild = useMemo(
    () => managedChildren.find((child) => child.id === selectedChildId) ?? managedChildren[0],
    [managedChildren, selectedChildId]
  );

  const baseCalendarEvents = remoteSnapshot?.calendarEvents ?? pilotCalendarEvents;
  const baseLearningRecords = remoteSnapshot?.learningRecords ?? pilotLearningRecords;
  const baseEducationGoals = remoteSnapshot?.educationGoals ?? pilotEducationGoals;
  const baseResources = remoteSnapshot?.resources ?? pilotResources;

  useEffect(() => {
    setRoadmapGoals(baseEducationGoals);
  }, [baseEducationGoals]);

  const learningRecords = useMemo(
    () => mergeRemoteAndLocal(baseLearningRecords, localLearningRecords),
    [baseLearningRecords, localLearningRecords]
  );
  const totalMinutes = learningRecords.reduce((sum, record) => sum + record.durationMinutes, 0);
  const calendarEvents = useMemo(
    () => mergeRemoteAndLocal(baseCalendarEvents, localCalendarEvents).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt)),
    [baseCalendarEvents, localCalendarEvents]
  );
  const workspaceLabel = useMemo(() => managedChildren.map((child) => child.firstName).join(" · "), [managedChildren]);
  const averageGoalProgress =
    roadmapGoals.length > 0
      ? Math.round(roadmapGoals.reduce((sum, goal) => sum + goal.progress, 0) / roadmapGoals.length)
      : 0;

  if (isMisconfigured) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <section className="w-full max-w-lg rounded-2xl border border-destructive/20 bg-card p-5 shadow-none">
          <p className="text-sm font-semibold text-red-600">部署配置错误</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">数据模式未配置</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            生产环境必须设置 <code className="rounded bg-muted px-1 py-0.5">NEXT_PUBLIC_FAMILY_DATA_MODE=private-api</code>。
            系统已停止回退到本机示例数据，避免家长误以为资料已经保存到数据库。
          </p>
        </section>
      </main>
    );
  }

  return (
    <AppShell activeMode={activeMode} onModeChange={handleModeChange} workspaceLabel={workspaceLabel}>
      <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-5">
        {activeMode === "today" && (
          <section id="dashboard" className="hidden overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-none sm:block sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold text-primary sm:text-sm">{pilotFamilyName}</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  <span className="sm:hidden">Family Education</span>
                  <span className="hidden sm:inline">Family Education Management System</span>
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:mt-3">
                  <span className="sm:hidden">今天事项、日程和资料集中处理。</span>
                  <span className="hidden sm:inline">第一屏处理今天要做的事，后面沉淀日程、资料、反馈和长期规划。</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => handleModeChange("more", "export-preview")}>
                  看导出效果
                </Button>
                <Button onClick={() => handleModeChange("week", "event-planner")}>
                  新增事项
                </Button>
              </div>
            </div>
          </section>
        )}

        {activeMode === "today" && (
          <>
            <DailyBrief
              childProfiles={managedChildren}
              events={calendarEvents}
              onModeChange={handleModeChange}
              onSelectChild={setSelectedChildId}
              records={learningRecords}
            />
            <TodayCommandCenter childProfiles={managedChildren} events={calendarEvents} onModeChange={handleModeChange} />

            <section className="rounded-2xl border border-border bg-muted/30 p-3">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 text-left"
                onClick={() => setShowTodayMetrics((current) => !current)}
              >
                <span>
                  <span className="block text-xs font-medium text-muted-foreground">本周统计</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">轻量查看，不作为每日主入口。</span>
                </span>
                <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  {showTodayMetrics ? "收起" : "展开"}
                </span>
              </button>
              {showTodayMetrics && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <div className="rounded-xl bg-card px-3 py-2">
                    <p className="text-muted-foreground">事项</p>
                    <p className="mt-1 text-base font-semibold text-foreground">{calendarEvents.length}</p>
                  </div>
                  <div className="rounded-xl bg-card px-3 py-2">
                    <p className="text-muted-foreground">学习</p>
                    <p className="mt-1 text-base font-semibold text-foreground">{totalMinutes}m</p>
                  </div>
                  <div className="rounded-xl bg-card px-3 py-2">
                    <p className="text-muted-foreground">目标</p>
                    <p className="mt-1 text-base font-semibold text-foreground">{averageGoalProgress}%</p>
                  </div>
                  <div className="rounded-xl bg-card px-3 py-2">
                    <p className="text-muted-foreground">孩子</p>
                    <p className="mt-1 text-base font-semibold text-foreground">{managedChildren.length}</p>
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        {activeMode === "week" && (
          <>
            <FamilyEventPlanner childProfiles={managedChildren} onEventsChange={setLocalCalendarEvents} />

            <section className="space-y-3">
              <div className="flex flex-col gap-1 px-1">
                <p className="text-sm font-medium text-foreground">周计划</p>
                <p className="text-xs text-muted-foreground">先看本周整体节奏，再处理近期最需要家长关注的事项。</p>
              </div>
              <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                <WeeklyOverview events={calendarEvents} childProfiles={managedChildren} />
                <UpcomingEvents events={calendarEvents} childProfiles={managedChildren} />
              </div>
            </section>

            <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
              <UnifiedCalendar events={calendarEvents} childProfiles={managedChildren} />
              <CalendarSyncCard currentEvents={calendarEvents} childProfiles={managedChildren} />
            </div>

            <section className="space-y-3">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-muted/30 p-3 text-left"
                onClick={() => setShowWeeklyReview((current) => !current)}
              >
                <span>
                  <span className="block text-xs font-medium text-muted-foreground">周报与复盘</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">需要导出或给家长讲解时再打开。</span>
                </span>
                <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  {showWeeklyReview ? "收起" : "展开"}
                </span>
              </button>
              {showWeeklyReview && (
                <div>
                  <WeeklyFamilyReport childProfiles={managedChildren} events={calendarEvents} goals={roadmapGoals} records={learningRecords} />
                </div>
              )}
            </section>
          </>
        )}

        {activeMode === "records" && (
          <>
            <section className="space-y-3">
              <div className="flex flex-col gap-1 px-1">
                <p className="text-sm font-medium text-foreground">日常沉淀</p>
                <p className="text-xs text-muted-foreground">高频记录入口：学习过程和资料文件先放在这里。</p>
              </div>
              <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
                <LearningRecordPlanner childProfiles={managedChildren} onRecordsChange={setLocalLearningRecords} />
                <LearningMaterialsVault childProfiles={managedChildren} />
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex flex-col gap-1 px-1">
                <p className="text-sm font-medium text-foreground">反馈记录</p>
                <p className="text-xs text-muted-foreground">孩子自评和家教反馈先作为中频模块，后续按实际使用再加强。</p>
              </div>
              <div className="grid gap-5 xl:grid-cols-2">
                <SelfEvaluationBoard childProfiles={managedChildren} />
                <TutorFeedbackBoard childProfiles={managedChildren} />
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex flex-col gap-1 px-1">
                <p className="text-sm font-medium text-foreground">孩子档案</p>
                <p className="text-xs text-muted-foreground">孩子信息不需要每天改，但需要长期保持准确。</p>
              </div>
              <div className="grid min-w-0 gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
                <ChildProfile child={selectedChild} records={learningRecords} goals={roadmapGoals} />
                <ChildManagement
                  childProfiles={managedChildren}
                  setChildren={setManagedChildren}
                  selectedChildId={selectedChildId}
                  onSelectChild={setSelectedChildId}
                />
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex flex-col gap-1 px-1">
                <p className="text-sm font-medium text-foreground">长期规划</p>
                <p className="text-xs text-muted-foreground">把成长趋势、教育路线图和三孩管理节奏放在同一个长期视图。</p>
              </div>
              <div className="grid min-w-0 gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
                <GrowthSummary childProfiles={managedChildren} records={learningRecords} goals={roadmapGoals} />
                <EducationRoadmap goals={roadmapGoals} childProfiles={managedChildren} onGoalsChange={setRoadmapGoals} />
              </div>
              <ThreeChildOperatingMatrix childProfiles={managedChildren} plans={childOperatingPlans} />
            </section>
          </>
        )}

        {activeMode === "more" && (
          <>
            <section className="space-y-3">
              <div className="flex flex-col gap-1 px-1">
                <p className="text-sm font-medium text-foreground">初始化资料</p>
                <p className="text-xs text-muted-foreground">用于第一次和家长对齐学校、固定课表、重要日期和关注点。</p>
              </div>
              <FamilyIntakeWorkspace childProfiles={managedChildren} />
            </section>

            <section className="space-y-3">
              <div className="flex flex-col gap-1 px-1">
                <p className="text-sm font-medium text-foreground">备份与导出</p>
                <p className="text-xs text-muted-foreground">导出周报、JSON 备份和 iOS 日历文件，便于长期留存。</p>
              </div>
              <ExportPreviewCenter
                childProfiles={managedChildren}
                events={calendarEvents}
                goals={roadmapGoals}
                records={learningRecords}
                resources={baseResources}
              />
            </section>

            <section className="space-y-3">
              <div className="flex flex-col gap-1 px-1">
                <p className="text-sm font-medium text-foreground">手机安装</p>
                <p className="text-xs text-muted-foreground">把网页添加到 iPhone 主屏幕，让家长像 App 一样打开。</p>
              </div>
              <PwaInstallCard />
            </section>
          </>
        )}

      </div>
    </AppShell>
  );
}
