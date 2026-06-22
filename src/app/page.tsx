"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck2, Clock3, GraduationCap, Target } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { CalendarSyncCard } from "@/components/dashboard/calendar-sync-card";
import { ChildManagement } from "@/components/dashboard/child-management";
import { ChildProfile } from "@/components/dashboard/child-profile";
import { DeploymentStatusCard } from "@/components/dashboard/deployment-status-card";
import { EducationRoadmap } from "@/components/dashboard/education-roadmap";
import { ExportPreviewCenter } from "@/components/dashboard/export-preview-center";
import { FamilyEventPlanner } from "@/components/dashboard/family-event-planner";
import { FamilyIntakeWorkspace } from "@/components/dashboard/family-intake-workspace";
import { GrowthSummary } from "@/components/dashboard/growth-summary";
import { LearningRecordPlanner } from "@/components/dashboard/learning-record-planner";
import { LearningMaterialsVault } from "@/components/dashboard/learning-materials-vault";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ParentActionBoard } from "@/components/dashboard/parent-action-board";
import { ParentHandoffPlan } from "@/components/dashboard/parent-handoff-plan";
import { PwaInstallCard } from "@/components/dashboard/pwa-install-card";
import { ResourceCenter } from "@/components/dashboard/resource-center";
import { SelfEvaluationBoard } from "@/components/dashboard/self-evaluation-board";
import { ThreeChildOperatingMatrix } from "@/components/dashboard/three-child-operating-matrix";
import { TutorFeedbackBoard } from "@/components/dashboard/tutor-feedback-board";
import { TodayCommandCenter } from "@/components/dashboard/today-command-center";
import { UnifiedCalendar } from "@/components/dashboard/unified-calendar";
import { UpcomingEvents } from "@/components/dashboard/upcoming-events";
import { WeeklyFamilyReport } from "@/components/dashboard/weekly-family-report";
import { WeeklyOverview } from "@/components/dashboard/weekly-overview";
import { Button } from "@/components/ui/button";
import type { FamilySnapshot } from "@/lib/core-types";
import { isPrivateApiMode } from "@/lib/private-api-client";
import {
  childOperatingPlans,
  parentActions,
  pilotCalendarEvents,
  pilotChildren,
  pilotEducationGoals,
  pilotFamilyName,
  pilotLearningRecords,
  pilotResources
} from "@/lib/pilot-data";

export default function Home() {
  const [managedChildren, setManagedChildren] = useState(pilotChildren);
  const [selectedChildId, setSelectedChildId] = useState(pilotChildren[0].id);
  const [localCalendarEvents, setLocalCalendarEvents] = useState<typeof pilotCalendarEvents>([]);
  const [localLearningRecords, setLocalLearningRecords] = useState<typeof pilotLearningRecords>([]);
  const [roadmapGoals, setRoadmapGoals] = useState<typeof pilotEducationGoals>(pilotEducationGoals);
  const [remoteSnapshot, setRemoteSnapshot] = useState<FamilySnapshot | null>(null);

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

  const learningRecords = useMemo(() => [...localLearningRecords, ...baseLearningRecords], [baseLearningRecords, localLearningRecords]);
  const totalMinutes = learningRecords.reduce((sum, record) => sum + record.durationMinutes, 0);
  const calendarEvents = useMemo(
    () => [...baseCalendarEvents, ...localCalendarEvents].sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt)),
    [baseCalendarEvents, localCalendarEvents]
  );
  const averageGoalProgress =
    roadmapGoals.length > 0
      ? Math.round(roadmapGoals.reduce((sum, goal) => sum + goal.progress, 0) / roadmapGoals.length)
      : 0;

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-5">
        <section id="dashboard" className="overflow-hidden rounded-lg border border-white/80 bg-white/90 p-4 shadow-sm backdrop-blur sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold text-primary sm:text-sm">{pilotFamilyName}</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                <span className="sm:hidden">Family Education</span>
                <span className="hidden sm:inline">Family Education Management System</span>
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:mt-3">
                <span className="sm:hidden">今天事项、日程和资料集中处理。</span>
                <span className="hidden sm:inline">第一屏处理今天要做的事，后面沉淀日程、资料、反馈和长期规划。</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <a href="#export-preview">看导出效果</a>
              </Button>
              <Button asChild>
                <a href="#event-planner">新增事项</a>
              </Button>
            </div>
          </div>
        </section>

        <TodayCommandCenter childProfiles={managedChildren} events={calendarEvents} records={learningRecords} />

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <MetricCard title="本周事项" value={String(calendarEvents.length)} detail="学校 / 课外 / 家庭复盘" icon={CalendarCheck2} tone="blue" />
          <MetricCard title="学习记录" value={`${totalMinutes}m`} detail="本周已记录时长" icon={Clock3} tone="teal" />
          <MetricCard title="教育目标" value={String(roadmapGoals.length)} detail={`${averageGoalProgress}% 平均进度`} icon={Target} tone="amber" />
          <MetricCard title="孩子档案" value={String(managedChildren.length)} detail="伯杨 / 仲杨 / 叔杨" icon={GraduationCap} tone="rose" />
        </section>

        <FamilyIntakeWorkspace childProfiles={managedChildren} />
        <FamilyEventPlanner childProfiles={managedChildren} onEventsChange={setLocalCalendarEvents} />

        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <WeeklyOverview events={calendarEvents} childProfiles={managedChildren} />
          <UpcomingEvents events={calendarEvents} childProfiles={managedChildren} />
        </div>

        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <UnifiedCalendar events={calendarEvents} childProfiles={managedChildren} />
          <CalendarSyncCard currentEvents={calendarEvents} childProfiles={managedChildren} />
        </div>

        <WeeklyFamilyReport childProfiles={managedChildren} events={calendarEvents} goals={roadmapGoals} records={learningRecords} />
        <ExportPreviewCenter
          childProfiles={managedChildren}
          events={calendarEvents}
          goals={roadmapGoals}
          records={learningRecords}
          resources={baseResources}
        />
        <ThreeChildOperatingMatrix childProfiles={managedChildren} plans={childOperatingPlans} />
        <LearningRecordPlanner childProfiles={managedChildren} onRecordsChange={setLocalLearningRecords} />
        <LearningMaterialsVault childProfiles={managedChildren} />

        <div className="grid gap-5 xl:grid-cols-2">
          <SelfEvaluationBoard childProfiles={managedChildren} />
          <TutorFeedbackBoard childProfiles={managedChildren} />
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

        <div className="grid min-w-0 gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
          <GrowthSummary childProfiles={managedChildren} records={learningRecords} goals={roadmapGoals} />
          <EducationRoadmap goals={roadmapGoals} childProfiles={managedChildren} onGoalsChange={setRoadmapGoals} />
        </div>

        <ResourceCenter resources={baseResources} childProfiles={managedChildren} />

        <div className="grid gap-5 xl:grid-cols-2">
          <ParentActionBoard actions={parentActions} />
          <ParentHandoffPlan />
        </div>

        <DeploymentStatusCard />
        <PwaInstallCard />

      </div>
    </AppShell>
  );
}
