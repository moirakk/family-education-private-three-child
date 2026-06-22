"use client";

import { ArrowRight, CalendarPlus, ClipboardList, FileDown, LibraryBig, MessageSquareText, SmilePlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DashboardMode } from "@/components/dashboard/app-shell";
import { getChildTheme } from "@/lib/child-theme";
import type { CalendarEvent, Child, LearningRecord } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getEventUrgency, sortEventsByUrgency, type Urgency } from "@/lib/urgency";

const quickActions = [
  { mode: "week" as const, label: "新增日程", icon: CalendarPlus, tone: "bg-blue-50 text-blue-700" },
  { mode: "records" as const, label: "记录学习", icon: ClipboardList, tone: "bg-teal-50 text-teal-700" },
  { mode: "records" as const, label: "上传资料", icon: LibraryBig, tone: "bg-violet-50 text-violet-700" },
  { mode: "more" as const, label: "查看导出", icon: FileDown, tone: "bg-slate-100 text-slate-700" }
];

const urgencyLabels: Record<Urgency, string> = {
  critical: "重点",
  warning: "本周",
  ok: "提醒",
  past: "已过"
};

const urgencyClasses: Record<Urgency, string> = {
  critical: "border-rose-300 bg-rose-50 text-rose-800",
  warning: "border-amber-300 bg-amber-50 text-amber-800",
  ok: "border-white/10 bg-white/10 text-slate-200",
  past: "border-slate-700 bg-slate-900 text-slate-400"
};

export function TodayCommandCenter({
  childProfiles,
  events,
  onModeChange,
  records
}: {
  childProfiles: Child[];
  events: CalendarEvent[];
  onModeChange: (mode: DashboardMode) => void;
  records: LearningRecord[];
}) {
  const nextEvents = sortEventsByUrgency(events).slice(0, 3);

  return (
    <section className="grid min-w-0 gap-3 sm:gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className="rounded-lg border border-white/80 bg-white/90 p-3 shadow-sm backdrop-blur sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-950">今天先做什么</p>
            <p className="mt-1 text-sm text-muted-foreground">家长日常高频入口集中在这里。</p>
          </div>
          <Badge variant="outline" className="hidden sm:inline-flex">今日工作台</Badge>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4">
          {quickActions.map((action) => (
            <Button
              key={action.label}
              type="button"
              variant="outline"
              className="h-auto justify-between rounded-lg bg-white px-2.5 py-3 sm:px-3"
              onClick={() => onModeChange(action.mode)}
            >
              <span className="flex min-w-0 items-center gap-2 sm:gap-3">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md sm:h-9 sm:w-9 ${action.tone}`}>
                  <action.icon className="h-4 w-4" />
                </span>
                <span className="truncate text-sm">{action.label}</span>
              </span>
              <ArrowRight className="hidden h-4 w-4 text-muted-foreground sm:block" />
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-white/80 bg-slate-950 p-3 text-white shadow-sm sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">下一步提醒</p>
            <p className="mt-1 text-xs text-slate-300">按时间优先处理，不用翻完整页面。</p>
          </div>
          <Badge variant="secondary">{nextEvents.length} 项</Badge>
        </div>
        <div className="mt-3 grid gap-2 sm:mt-4">
          {nextEvents.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => onModeChange("week")}
              className="rounded-md bg-white/10 p-3 text-left transition hover:bg-white/15"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 text-sm font-medium">{event.title}</p>
                <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium", urgencyClasses[getEventUrgency(event)])}>
                  {urgencyLabels[getEventUrgency(event)]}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-300">
                <span>{new Date(event.startsAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                {event.childIds.slice(0, 2).map((childId) => {
                  const childIndex = childProfiles.findIndex((child) => child.id === childId);
                  const theme = getChildTheme(childIndex);
                  return <span key={childId} className={cn("h-1.5 w-1.5 rounded-full", theme.dot)} />;
                })}
              </div>
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300 sm:mt-4">
          <button type="button" onClick={() => onModeChange("records")} className="flex items-center gap-2 rounded-md bg-white/10 p-2 hover:bg-white/15">
            <SmilePlus className="h-4 w-4" />
            孩子自评
          </button>
          <button type="button" onClick={() => onModeChange("records")} className="flex items-center gap-2 rounded-md bg-white/10 p-2 hover:bg-white/15">
            <MessageSquareText className="h-4 w-4" />
            家教反馈
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3 xl:col-span-2">
        {childProfiles.map((child, childIndex) => {
          const childEvents = events.filter((event) => event.childIds.includes(child.id)).length;
          const minutes = records.filter((record) => record.childId === child.id).reduce((sum, record) => sum + record.durationMinutes, 0);
          const theme = getChildTheme(childIndex);

          return (
            <button
              key={child.id}
              type="button"
              onClick={() => onModeChange("records")}
              className={cn("rounded-lg border border-l-4 border-white/80 bg-white/80 p-3 text-left shadow-sm transition hover:bg-white sm:p-4", theme.border)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{child.firstName}</p>
                  <p className="mt-1 truncate text-[11px] text-muted-foreground sm:text-xs">{child.grade}</p>
                </div>
                <span className={cn("mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full sm:h-3 sm:w-3", theme.dot)} />
              </div>
              <div className="mt-3 grid gap-1 text-[11px] text-muted-foreground sm:mt-4 sm:flex sm:items-center sm:gap-2 sm:text-xs">
                <Badge variant="secondary" className="justify-center px-1.5">{childEvents} 项</Badge>
                <Badge variant="outline" className="justify-center px-1.5">{minutes}m</Badge>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
