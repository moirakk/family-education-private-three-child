"use client";

import { useMemo, useState } from "react";
import { CalendarCheck2, Clock3, GraduationCap, Target } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { ChildManagement } from "@/components/dashboard/child-management";
import { ChildProfile } from "@/components/dashboard/child-profile";
import { EducationRoadmap } from "@/components/dashboard/education-roadmap";
import { GrowthSummary } from "@/components/dashboard/growth-summary";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ParentActionBoard } from "@/components/dashboard/parent-action-board";
import { ProductTrackSplit } from "@/components/dashboard/product-track-split";
import { ResourceCenter } from "@/components/dashboard/resource-center";
import { ThreeChildOperatingMatrix } from "@/components/dashboard/three-child-operating-matrix";
import { UnifiedCalendar } from "@/components/dashboard/unified-calendar";
import { UpcomingEvents } from "@/components/dashboard/upcoming-events";
import { WeeklyOverview } from "@/components/dashboard/weekly-overview";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  childOperatingPlans,
  parentActions,
  pilotCalendarEvents,
  pilotChildren,
  pilotEducationGoals,
  pilotFamilyName,
  pilotLearningRecords,
  pilotResources,
  productTracks
} from "@/lib/pilot-data";

export default function Home() {
  const [managedChildren, setManagedChildren] = useState(pilotChildren);
  const [selectedChildId, setSelectedChildId] = useState(pilotChildren[0].id);

  const selectedChild = useMemo(
    () => managedChildren.find((child) => child.id === selectedChildId) ?? managedChildren[0],
    [managedChildren, selectedChildId]
  );

  const totalMinutes = pilotLearningRecords.reduce((sum, record) => sum + record.durationMinutes, 0);
  const averageGoalProgress = Math.round(
    pilotEducationGoals.reduce((sum, goal) => sum + goal.progress, 0) / pilotEducationGoals.length
  );

  return (
    <AppShell>
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">{pilotFamilyName}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              伯仲叔三人教育管理系统
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              明天优先交付的家庭定制版：把三位孩子的学校事项、课外安排、学习记录、资源材料和长期路线图放进一个家长可执行的中枢。
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">导出周报</Button>
            <Button>新增事项</Button>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="本周事项" value={String(pilotCalendarEvents.length)} detail="学校 / 课外 / 家庭复盘" icon={CalendarCheck2} tone="blue" />
          <MetricCard title="学习记录" value={`${totalMinutes}m`} detail="本周已记录时长" icon={Clock3} tone="teal" />
          <MetricCard title="教育目标" value={String(pilotEducationGoals.length)} detail={`${averageGoalProgress}% 平均进度`} icon={Target} tone="amber" />
          <MetricCard title="孩子档案" value={String(managedChildren.length)} detail="伯 / 仲 / 叔 定制版" icon={GraduationCap} tone="rose" />
        </section>

        <ProductTrackSplit tracks={productTracks} />
        <ParentActionBoard actions={parentActions} />
        <ThreeChildOperatingMatrix childProfiles={managedChildren} plans={childOperatingPlans} />

        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <WeeklyOverview events={pilotCalendarEvents} childProfiles={managedChildren} />
          <UpcomingEvents events={pilotCalendarEvents} childProfiles={managedChildren} />
        </div>

        <ChildManagement
          childProfiles={managedChildren}
          setChildren={setManagedChildren}
          selectedChildId={selectedChildId}
          onSelectChild={setSelectedChildId}
        />

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-2 sm:inline-flex sm:w-auto">
            <TabsTrigger value="profile">孩子档案</TabsTrigger>
            <TabsTrigger value="calendar">统一日历</TabsTrigger>
            <TabsTrigger value="growth">成长记录</TabsTrigger>
            <TabsTrigger value="roadmap">教育路线</TabsTrigger>
            <TabsTrigger value="resources">资源中心</TabsTrigger>
          </TabsList>
          <TabsContent value="profile">
            <ChildProfile child={selectedChild} records={pilotLearningRecords} goals={pilotEducationGoals} />
          </TabsContent>
          <TabsContent value="calendar">
            <UnifiedCalendar events={pilotCalendarEvents} childProfiles={managedChildren} />
          </TabsContent>
          <TabsContent value="growth">
            <GrowthSummary childProfiles={managedChildren} records={pilotLearningRecords} goals={pilotEducationGoals} />
          </TabsContent>
          <TabsContent value="roadmap">
            <EducationRoadmap goals={pilotEducationGoals} childProfiles={managedChildren} />
          </TabsContent>
          <TabsContent value="resources">
            <ResourceCenter resources={pilotResources} childProfiles={managedChildren} />
          </TabsContent>
        </Tabs>

        <div className="grid gap-5 xl:grid-cols-2">
          <GrowthSummary childProfiles={managedChildren} records={pilotLearningRecords} goals={pilotEducationGoals} />
          <ChildProfile child={selectedChild} records={pilotLearningRecords} goals={pilotEducationGoals} />
        </div>

        <UnifiedCalendar events={pilotCalendarEvents} childProfiles={managedChildren} />
        <EducationRoadmap goals={pilotEducationGoals} childProfiles={managedChildren} />
        <ResourceCenter resources={pilotResources} childProfiles={managedChildren} />
      </div>
    </AppShell>
  );
}
