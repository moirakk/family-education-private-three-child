import { CalendarClock, ChevronRight, CircleAlert, Clock3 } from "lucide-react";
import type { DashboardMode } from "@/components/dashboard/app-shell";
import { Badge } from "@/components/ui/badge";
import { getChildTheme } from "@/lib/child-theme";
import type { CalendarEvent, Child, LearningRecord } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getEventUrgency } from "@/lib/urgency";

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

  return (
    <section className="overflow-hidden rounded-lg border border-white/80 bg-slate-950 text-white shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_380px]">
        <button type="button" onClick={() => onModeChange("week")} className="min-w-0 p-4 text-left sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-300">{formatDayLabel(today)}</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
                {nextEvent ? "下一件事" : "今天暂时没有待办"}
              </h2>
            </div>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/10">
              <CalendarClock className="h-4 w-4" />
            </span>
          </div>

          {nextEvent ? (
            <div className="mt-4 rounded-lg bg-white/10 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold">{nextEvent.title}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {formatTime(nextEvent.startsAt)}
                    {nextEvent.location ? ` · ${nextEvent.location}` : ""}
                  </p>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
              </div>
            </div>
          ) : (
            <p className="mt-4 rounded-lg bg-white/10 p-3 text-sm text-slate-300">
              可以先补学习记录、整理资料，或者查看本周安排。
            </p>
          )}
        </button>

        <div className="grid grid-cols-3 border-t border-white/10 lg:border-l lg:border-t-0">
          <button type="button" onClick={() => onModeChange("week")} className="p-3 text-left hover:bg-white/5 sm:p-4">
            <p className="text-xs text-slate-400">今日事项</p>
            <p className="mt-1 text-2xl font-semibold">{todayEvents.length}</p>
          </button>
          <button type="button" onClick={() => onModeChange("week")} className="border-l border-white/10 p-3 text-left hover:bg-white/5 sm:p-4">
            <p className="text-xs text-slate-400">7 天内</p>
            <p className="mt-1 text-2xl font-semibold">{weekEvents.length}</p>
          </button>
          <button type="button" onClick={() => onModeChange("records")} className="border-l border-white/10 p-3 text-left hover:bg-white/5 sm:p-4">
            <p className="text-xs text-slate-400">学习分钟</p>
            <p className="mt-1 text-2xl font-semibold">{records.reduce((sum, record) => sum + record.durationMinutes, 0)}</p>
          </button>
        </div>
      </div>

      <div className="grid gap-2 border-t border-white/10 p-3 sm:grid-cols-3 sm:p-4">
        {childProfiles.map((child, index) => {
          const theme = getChildTheme(index);
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
              className="flex items-center justify-between gap-3 rounded-md bg-white/10 px-3 py-2 text-left hover:bg-white/15"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", theme.dot)} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{child.firstName}</p>
                  <p className="text-xs text-slate-400">{child.grade}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {childCriticalEvents > 0 ? (
                  <Badge className="border-rose-300 bg-rose-50 text-rose-700">
                    <CircleAlert className="mr-1 h-3 w-3" />
                    关注
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-white/10 text-slate-200 hover:bg-white/10">
                    {childWeekEvents} 项
                  </Badge>
                )}
                <span className="hidden items-center gap-1 text-xs text-slate-400 sm:flex">
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
