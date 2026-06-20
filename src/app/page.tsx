"use client";

import { useMemo, useState } from "react";
import { CalendarCheck2, Clock3, GraduationCap, Target } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { CalendarSyncCard } from "@/components/dashboard/calendar-sync-card";
import { ChildManagement } from "@/components/dashboard/child-management";
import { ChildProfile } from "@/components/dashboard/child-profile";
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
import { UnifiedCalendar } from "@/components/dashboard/unified-calendar";
import { UpcomingEvents } from "@/components/dashboard/upcoming-events";
import { WeeklyFamilyReport } from "@/components/dashboard/weekly-family-report";
import { WeeklyOverview } from "@/components/dashboard/weekly-overview";
import { Button } from "@/components/ui/button";
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

  const selectedChild = useMemo(
    () => managedChildren.find((child) => child.id === selectedChildId) ?? managedChildren[0],
    [managedChildren, selectedChildId]
  );

  const learningRecords = useMemo(() => [...localLearningRecords, ...pilotLearningRecords], [localLearningRecords]);
  const totalMinutes = learningRecords.reduce((sum, record) => sum + record.durationMinutes, 0);
  const calendarEvents = useMemo(
    () => [...pilotCalendarEvents, ...localCalendarEvents].sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt)),
    [localCalendarEvents]
  );
  const averageGoalProgress = Math.round(
    pilotEducationGoals.reduce((sum, goal) => sum + goal.progress, 0) / pilotEducationGoals.length
  );

  return (
    <AppShell>
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <section id="dashboard" className="rounded-lg border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium text-primary">{pilotFamilyName}</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                伯仲叔三人教育管理系统
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                今日现场使用：先补信息、排日程、看周报，再沉淀为长期私有 PWA。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <a href="#weekly-report">导出周报</a>
              </Button>
              <Button asChild>
                <a href="#event-planner">新增事项</a>
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="本周事项" value={String(calendarEvents.length)} detail="学校 / 课外 / 家庭复盘" icon={CalendarCheck2} tone="blue" />
          <MetricCard title="学习记录" value={`${totalMinutes}m`} detail="本周已记录时长" icon={Clock3} tone="teal" />
          <MetricCard title="教育目标" value={String(pilotEducationGoals.length)} detail={`${averageGoalProgress}% 平均进度`} icon={Target} tone="amber" />
          <MetricCard title="孩子档案" value={String(managedChildren.length)} detail="伯杨 / 仲杨 / 叔杨" icon={GraduationCap} tone="rose" />
        </section>

        <FamilyIntakeWorkspace childProfiles={managedChildren} />
        <FamilyEventPlanner childProfiles={managedChildren} onEventsChange={setLocalCalendarEvents} />

        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <WeeklyOverview events={calendarEvents} childProfiles={managedChildren} />
          <UpcomingEvents events={calendarEvents} childProfiles={managedChildren} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <UnifiedCalendar events={calendarEvents} childProfiles={managedChildren} />
          <CalendarSyncCard currentEvents={calendarEvents} childProfiles={managedChildren} />
        </div>

        <WeeklyFamilyReport childProfiles={managedChildren} events={calendarEvents} goals={pilotEducationGoals} records={learningRecords} />
        <ExportPreviewCenter
          childProfiles={managedChildren}
          events={calendarEvents}
          goals={pilotEducationGoals}
          records={learningRecords}
          resources={pilotResources}
        />
        <ThreeChildOperatingMatrix childProfiles={managedChildren} plans={childOperatingPlans} />
        <LearningRecordPlanner childProfiles={managedChildren} onRecordsChange={setLocalLearningRecords} />
        <LearningMaterialsVault childProfiles={managedChildren} />

        <div className="grid gap-5 xl:grid-cols-2">
          <SelfEvaluationBoard childProfiles={managedChildren} />
          <TutorFeedbackBoard childProfiles={managedChildren} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
          <ChildProfile child={selectedChild} records={learningRecords} goals={pilotEducationGoals} />
          <ChildManagement
            childProfiles={managedChildren}
            setChildren={setManagedChildren}
            selectedChildId={selectedChildId}
            onSelectChild={setSelectedChildId}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
          <GrowthSummary childProfiles={managedChildren} records={learningRecords} goals={pilotEducationGoals} />
          <EducationRoadmap goals={pilotEducationGoals} childProfiles={managedChildren} />
        </div>

        <ResourceCenter resources={pilotResources} childProfiles={managedChildren} />

        <div className="grid gap-5 xl:grid-cols-2">
          <ParentActionBoard actions={parentActions} />
          <ParentHandoffPlan />
        </div>

        <PwaInstallCard />

      </div>
    </AppShell>
  );
}
