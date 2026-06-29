"use client";

import { ArrowRight, CalendarPlus, CheckCircle2, ClipboardList, FileDown, LibraryBig, MessageSquareText, SmilePlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DashboardMode } from "@/components/dashboard/app-shell";
import { getChildTheme } from "@/lib/child-theme";
import type { CalendarEvent, Child, LearningRecord } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getEventUrgency, sortEventsByUrgency, type Urgency } from "@/lib/urgency";

const quickActions = [
  { mode: "week" as const, label: "新增日程", hint: "考试、课外、家庭事项", icon: CalendarPlus, tone: "bg-blue-50 text-blue-700 ring-blue-100" },
  { mode: "records" as const, label: "记录学习", hint: "几秒记录一次学习", icon: ClipboardList, tone: "bg-teal-50 text-teal-700 ring-teal-100" },
  { mode: "records" as const, label: "上传资料", hint: "讲义、试卷、笔记", icon: LibraryBig, tone: "bg-amber-50 text-amber-700 ring-amber-100" },
  { mode: "more" as const, label: "查看导出", hint: "备份和分享效果", icon: FileDown, tone: "bg-slate-100 text-slate-700 ring-slate-200" }
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
  ok: "border-blue-200 bg-blue-50 text-blue-700",
  past: "border-slate-200 bg-slate-100 text-slate-500"
};

function formatEventTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

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
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const nextEvents = sortEventsByUrgency(events.filter((event) => new Date(event.startsAt) >= todayStart)).slice(0, 3);

  return (
    <section className="grid min-w-0 gap-3 sm:gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className="rounded-2xl border border-white/80 bg-white/90 p-3 shadow-sm shadow-slate-200/60 ring-1 ring-slate-950/[0.03] backdrop-blur sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-950">高频操作</p>
            <p className="mt-1 text-sm text-muted-foreground">把每天最常用的动作放在手边。</p>
          </div>
          <Badge variant="outline" className="hidden rounded-full bg-white sm:inline-flex">今日工作台</Badge>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4">
          {quickActions.map((action) => (
            <button
              key={action.label}
              type="button"
              className="group flex min-h-24 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-[0_1px_0_rgba(15,23,42,0.03)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-sm"
              onClick={() => onModeChange(action.mode)}
            >
              <span className="flex items-center justify-between gap-2">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${action.tone}`}>
                  <action.icon className="h-4 w-4" />
                </span>
                <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-slate-950">{action.label}</span>
                <span className="mt-1 block text-xs leading-4 text-slate-500">{action.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/80 bg-white/90 p-3 shadow-sm shadow-slate-200/60 ring-1 ring-slate-950/[0.03] backdrop-blur sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-950">下一步提醒</p>
            <p className="mt-1 text-xs text-slate-500">按紧急度排序，少翻页面。</p>
          </div>
          <Badge variant="secondary" className="rounded-full">{nextEvents.length} 项</Badge>
        </div>
        <div className="mt-3 grid gap-2 sm:mt-4">
          {nextEvents.length > 0 ? (
            nextEvents.map((event) => {
              const urgency = getEventUrgency(event);

              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onModeChange("week")}
                  className="rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-[0_1px_0_rgba(15,23,42,0.03)] transition hover:border-blue-200 hover:bg-blue-50/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 line-clamp-2 text-sm font-semibold leading-5 text-slate-950">{event.title}</p>
                    <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium", urgencyClasses[urgency])}>
                      {urgencyLabels[urgency]}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                    <span>{formatEventTime(event.startsAt)}</span>
                    {event.childIds.slice(0, 3).map((childId) => {
                      const childIndex = childProfiles.findIndex((child) => child.id === childId);
                      const theme = getChildTheme(childIndex);
                      return <span key={childId} className={cn("h-1.5 w-1.5 rounded-full", theme.dot)} />;
                    })}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              暂无近期提醒。可以先补一条学习记录，让系统开始沉淀趋势。
            </div>
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 sm:mt-4">
          <button type="button" onClick={() => onModeChange("records")} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 hover:bg-white">
            <SmilePlus className="h-4 w-4" />
            孩子自评
          </button>
          <button type="button" onClick={() => onModeChange("records")} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 hover:bg-white">
            <MessageSquareText className="h-4 w-4" />
            家教反馈
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3 xl:col-span-2">
        {childProfiles.map((child, childIndex) => {
          const childEvents = events.filter((event) => event.childIds.includes(child.id)).length;
          const minutes = records.filter((record) => record.childId === child.id).reduce((sum, record) => sum + record.durationMinutes, 0);
          const theme = getChildTheme(childIndex);

          return (
            <button
              key={child.id}
              type="button"
              onClick={() => onModeChange("records")}
              className={cn(
                "rounded-2xl border border-l-4 border-white/80 bg-white/85 p-3 text-left shadow-sm shadow-slate-200/50 ring-1 ring-slate-950/[0.03] transition hover:-translate-y-0.5 hover:bg-white sm:p-4",
                theme.border
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{child.firstName}</p>
                  <p className="mt-1 truncate text-[11px] text-muted-foreground sm:text-xs">{child.grade}</p>
                </div>
                <span className={cn("mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full sm:h-3 sm:w-3", theme.dot)} />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-muted-foreground sm:mt-4 sm:text-xs">
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="justify-center rounded-full px-2">{childEvents} 项</Badge>
                  <Badge variant="outline" className="justify-center rounded-full px-2">{minutes}m</Badge>
                </div>
                <CheckCircle2 className="h-4 w-4 text-slate-300" />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
