"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { AppShell, type DashboardMode } from "@/components/dashboard/app-shell";
import { DailyBrief } from "@/components/dashboard/daily-brief";
import { TodayCommandCenter } from "@/components/dashboard/today-command-center";
import type { FamilySnapshot } from "@/lib/core-types";
import { isFamilyDataModeMisconfigured, isPrivateApiMode } from "@/lib/private-api-client";
import { mergeRemoteAndLocal } from "@/lib/reconciled-collection";
import {
  pilotCalendarEvents,
  pilotChildren,
  pilotEducationGoals,
  pilotLearningRecords,
  pilotResources
} from "@/lib/pilot-data";

function LoadingSection() {
  return <div className="min-h-32 rounded-2xl border border-border bg-card p-4" />;
}

const CalendarSyncCard = dynamic(() => import("@/components/dashboard/calendar-sync-card").then((mod) => mod.CalendarSyncCard), { loading: LoadingSection });
const EducationRoadmap = dynamic(() => import("@/components/dashboard/education-roadmap").then((mod) => mod.EducationRoadmap), { loading: LoadingSection });
const ExportPreviewCenter = dynamic(() => import("@/components/dashboard/export-preview-center").then((mod) => mod.ExportPreviewCenter), { loading: LoadingSection });
const FamilyEventPlanner = dynamic(() => import("@/components/dashboard/family-event-planner").then((mod) => mod.FamilyEventPlanner), { loading: LoadingSection });
const GradeSettings = dynamic(() => import("@/components/dashboard/grade-settings").then((mod) => mod.GradeSettings), { loading: LoadingSection });
const LearningRecordPlanner = dynamic(() => import("@/components/dashboard/learning-record-planner").then((mod) => mod.LearningRecordPlanner), { loading: LoadingSection });
const PwaInstallCard = dynamic(() => import("@/components/dashboard/pwa-install-card").then((mod) => mod.PwaInstallCard), { loading: LoadingSection });
const ShareLinksCard = dynamic(() => import("@/components/dashboard/share-links-card").then((mod) => mod.ShareLinksCard), { loading: LoadingSection });
const TutorFeedbackBoard = dynamic(() => import("@/components/dashboard/tutor-feedback-board").then((mod) => mod.TutorFeedbackBoard), { loading: LoadingSection });
const UnifiedCalendar = dynamic(() => import("@/components/dashboard/unified-calendar").then((mod) => mod.UnifiedCalendar), { loading: LoadingSection });
const WeeklyFamilyReport = dynamic(() => import("@/components/dashboard/weekly-family-report").then((mod) => mod.WeeklyFamilyReport), { loading: LoadingSection });

const hashModeMap: Record<string, DashboardMode> = {
  today: "today",
  dashboard: "today",
  schedule: "week",
  week: "week",
  "event-planner": "week",
  calendar: "week",
  records: "records",
  "learning-records": "records",
  "tutor-feedback": "records",
  roadmap: "records",
  settings: "more",
  more: "more",
  "calendar-sync": "more",
  "share-links": "more",
  "export-preview": "more"
};

function modeFromHash(hash: string) {
  return hashModeMap[hash.replace(/^#/, "")] ?? null;
}

function scrollToTarget(targetId?: string, attempt = 0) {
  window.requestAnimationFrame(() => {
    const target = targetId ? document.getElementById(targetId) : null;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (targetId && attempt < 10) {
      window.setTimeout(() => scrollToTarget(targetId, attempt + 1), 80);
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

export default function Home() {
  const misconfigured = isFamilyDataModeMisconfigured();
  const [children, setChildren] = useState(pilotChildren);
  const [todayChildId, setTodayChildId] = useState<string | null>(null);
  const [localEvents, setLocalEvents] = useState<typeof pilotCalendarEvents>([]);
  const [localRecords, setLocalRecords] = useState<typeof pilotLearningRecords>([]);
  const [goals, setGoals] = useState(pilotEducationGoals);
  const [snapshot, setSnapshot] = useState<FamilySnapshot | null>(null);
  const [activeMode, setActiveMode] = useState<DashboardMode>("today");
  const [showWeeklyReport, setShowWeeklyReport] = useState(false);
  const [eventFormRequest, setEventFormRequest] = useState(0);
  const [recordFormRequest, setRecordFormRequest] = useState(0);

  function changeMode(mode: DashboardMode, targetId?: string) {
    if (targetId === "event-planner") setEventFormRequest((value) => value + 1);
    if (targetId === "learning-records") setRecordFormRequest((value) => value + 1);
    setActiveMode(mode);
    window.history.replaceState(null, "", `#${targetId ?? (mode === "week" ? "schedule" : mode === "more" ? "settings" : mode)}`);
    scrollToTarget(targetId);
  }

  useEffect(() => {
    const sync = () => {
      const mode = modeFromHash(window.location.hash);
      if (!mode) return;
      setActiveMode(mode);
      scrollToTarget(window.location.hash.replace(/^#/, "") || undefined);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    if (!isPrivateApiMode()) return;
    let active = true;
    fetch("/api/private/snapshot")
      .then(async (response) => {
        const payload = (await response.json()) as { data?: FamilySnapshot; error?: string };
        if (!response.ok || !payload.data) throw new Error(payload.error ?? "读取家庭数据失败");
        return payload.data;
      })
      .then((data) => {
        if (!active) return;
        setSnapshot(data);
        if (data.children.length) setChildren(data.children);
      })
      .catch(() => active && setSnapshot(null));
    return () => { active = false; };
  }, []);

  const events = useMemo(
    () => mergeRemoteAndLocal(snapshot?.calendarEvents ?? pilotCalendarEvents, localEvents).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt)),
    [localEvents, snapshot]
  );
  const records = useMemo(
    () => mergeRemoteAndLocal(snapshot?.learningRecords ?? pilotLearningRecords, localRecords),
    [localRecords, snapshot]
  );
  const resources = snapshot?.resources ?? pilotResources;
  const workspaceLabel = children.map((child) => child.firstName).join(" · ");

  useEffect(() => setGoals(snapshot?.educationGoals ?? pilotEducationGoals), [snapshot]);

  if (misconfigured) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <section className="w-full max-w-lg rounded-2xl border border-destructive/20 bg-card p-5">
          <p className="text-sm font-semibold text-red-600">部署配置错误</p>
          <h1 className="mt-2 text-2xl font-semibold">数据模式未配置</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">请设置 NEXT_PUBLIC_FAMILY_DATA_MODE=private-api 后重新部署。</p>
        </section>
      </main>
    );
  }

  return (
    <AppShell activeMode={activeMode} onModeChange={changeMode} workspaceLabel={workspaceLabel}>
      <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-5">
        {activeMode === "today" ? (
          <>
            <DailyBrief
              childProfiles={children}
              events={events}
              onModeChange={changeMode}
              onSelectChild={(childId) => setTodayChildId((current) => current === childId ? null : childId)}
              selectedChildId={todayChildId}
            />
            <TodayCommandCenter childProfiles={children} events={events} onModeChange={changeMode} selectedChildId={todayChildId} />
          </>
        ) : null}

        {activeMode === "week" ? (
          <>
            <FamilyEventPlanner childProfiles={children} existingEvents={events} onEventsChange={setLocalEvents} openFormRequest={eventFormRequest} />
            <UnifiedCalendar events={events} childProfiles={children} />
            <section className="rounded-2xl border border-border bg-card p-3">
              <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => setShowWeeklyReport((value) => !value)}>
                <span>
                  <span className="block text-sm font-medium">家庭周报</span>
                  <span className="mt-1 block text-xs text-muted-foreground">有数据时用于阶段复盘</span>
                </span>
                <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{showWeeklyReport ? "收起" : "展开"}</span>
              </button>
              {showWeeklyReport ? <div className="mt-4"><WeeklyFamilyReport childProfiles={children} events={events} goals={goals} records={records} /></div> : null}
            </section>
          </>
        ) : null}

        {activeMode === "records" ? (
          <>
            <LearningRecordPlanner childProfiles={children} existingRecords={records} onRecordsChange={setLocalRecords} openFormRequest={recordFormRequest} />
            <TutorFeedbackBoard childProfiles={children} />
            <EducationRoadmap goals={goals} childProfiles={children} onGoalsChange={setGoals} />
          </>
        ) : null}

        {activeMode === "more" ? (
          <>
            <CalendarSyncCard currentEvents={events} childProfiles={children} />
            <ShareLinksCard />
            <ExportPreviewCenter childProfiles={children} events={events} goals={goals} records={records} resources={resources} />
            <GradeSettings childProfiles={children} setChildren={setChildren} />
            <PwaInstallCard />
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
