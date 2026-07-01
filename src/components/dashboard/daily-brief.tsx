import { CalendarClock, ChevronRight, CircleAlert, Clock3, Sparkles } from "lucide-react";
import type { DashboardMode } from "@/components/dashboard/app-shell";
import { Badge } from "@/components/ui/badge";
import { getChildTheme } from "@/lib/child-theme";
import type { CalendarEvent, Child, LearningRecord } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getEventUrgency, type Urgency } from "@/lib/urgency";

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short"
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function eventBelongsToChild(event: CalendarEvent, childId: string) {
  return event.childIds.length === 0 || event.childIds.includes(childId);
}

const urgencyCopy: Record<Urgency, { label: string; className: string }> = {
  critical: { label: "需要关注", className: "border-rose-200 bg-rose-50 text-rose-700" },
  warning: { label: "本周安排", className: "border-amber-200 bg-amber-50 text-amber-700" },
  ok: { label: "已安排", className: "border-blue-200 bg-blue-50 text-blue-700" },
  past: { label: "已过期", className: "border-slate-200 bg-slate-100 text-slate-600" }
};

export function DailyBrief({
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
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  const weekEnd = endOfDay(addDays(today, 7));
  const upcomingEvents = events.filter((event) => new Date(event.startsAt) >= todayStart);
  const todayEvents = upcomingEvents.filter((event) => new Date(event.startsAt) <= todayEnd);
  const weekEvents = upcomingEvents.filter((event) => new Date(event.startsAt) <= weekEnd);
  const nextEvent = upcomingEvents[0];
  const nextUrgency = nextEvent ? getEventUrgency(nextEvent, today) : null;
  const totalMinutes = records.reduce((sum, record) => sum + record.durationMinutes, 0);

  return (
    <section className="overflow-hidden rounded-2xl border border-white/80 bg-white/90 shadow-sm shadow-slate-200/60 ring-1 ring-slate-950/[0.03] backdrop-blur">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_390px]">
        <button type="button" onClick={() => onModeChange("week")} className="min-w-0 p-4 text-left transition hover:bg-slate-50/60 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-medium text-blue-600">
                <Sparkles className="h-3.5 w-3.5" />
                {formatDayLabel(today)}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                {nextEvent ? "今天先看这一件" : "今天节奏很干净"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {nextEvent ? "打开后先处理最近事项，再补学习记录和资料。" : "没有紧急事项，可以补记录或整理资料。"}
              </p>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-200">
              <CalendarClock className="h-5 w-5" />
            </span>
          </div>

          {nextEvent ? (
            <div className="mt-4 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-3.5 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {nextUrgency ? (
                      <Badge variant="outline" className={cn("h-6 rounded-full px-2", urgencyCopy[nextUrgency].className)}>
                        {urgencyCopy[nextUrgency].label}
                      </Badge>
                    ) : null}
                    <span className="text-xs font-medium text-slate-500">{formatTime(nextEvent.startsAt)}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-lg font-semibold leading-6 text-slate-950">{nextEvent.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{nextEvent.location ? nextEvent.location : "点击查看本周安排"}</p>
                </div>
                <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-blue-600" />
              </div>
            </div>
          ) : (
            <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              可以先补学习记录、整理资料，或者查看本周安排。
            </p>
          )}
        </button>

        <div className="grid grid-cols-3 border-t border-slate-200 bg-slate-50/70 lg:border-l lg:border-t-0">
          <button type="button" onClick={() => onModeChange("week")} className="p-3 text-left transition hover:bg-white sm:p-4">
            <p className="text-xs text-slate-500">今日事项</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{todayEvents.length}</p>
          </button>
          <button type="button" onClick={() => onModeChange("week")} className="border-l border-slate-200 p-3 text-left transition hover:bg-white sm:p-4">
            <p className="text-xs text-slate-500">7 天内</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{weekEvents.length}</p>
          </button>
          <button type="button" onClick={() => onModeChange("records")} className="border-l border-slate-200 p-3 text-left transition hover:bg-white sm:p-4">
            <p className="text-xs text-slate-500">学习分钟</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{totalMinutes}</p>
          </button>
        </div>
      </div>

      <div className="grid gap-2 border-t border-slate-200 p-3 sm:grid-cols-3 sm:p-4">
        {childProfiles.map((child) => {
          const theme = getChildTheme(child);
          const childWeekEvents = weekEvents.filter((event) => eventBelongsToChild(event, child.id)).length;
          const childCriticalEvents = weekEvents.filter(
            (event) => eventBelongsToChild(event, child.id) && getEventUrgency(event, today) === "critical"
          ).length;
          const childMinutes = records
            .filter((record) => record.childId === child.id)
            .reduce((sum, record) => sum + record.durationMinutes, 0);

          return (
            <button
              key={child.id}
              type="button"
              onClick={() => onModeChange("records")}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left shadow-[0_1px_0_rgba(15,23,42,0.03)] transition hover:border-blue-200 hover:bg-blue-50/40"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={theme.dotStyle} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{child.firstName}</p>
                  <p className="text-xs text-slate-500">{child.grade}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {childCriticalEvents > 0 ? (
                  <Badge className="border-rose-300 bg-rose-50 text-rose-700">
                    <CircleAlert className="mr-1 h-3 w-3" />
                    关注
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100">
                    {childWeekEvents} 项
                  </Badge>
                )}
                <span className="hidden items-center gap-1 text-xs text-slate-500 sm:flex">
                  <Clock3 className="h-3 w-3" />
                  {childMinutes}m
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
