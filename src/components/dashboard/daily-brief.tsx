import { ChevronRight, Sparkles } from "lucide-react";
import type { CSSProperties } from "react";
import type { DashboardMode } from "@/components/dashboard/app-shell";
import { Badge } from "@/components/ui/badge";
import { getChildTheme } from "@/lib/child-theme";
import type { CalendarEvent, Child } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getEventUrgency, type Urgency } from "@/lib/urgency";

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function greetingForHour(hour: number) {
  if (hour < 11) return "早上好";
  if (hour < 14) return "中午好";
  if (hour < 18) return "下午好";
  return "晚上好";
}

function formatDayLabel(date: Date) {
  const dateLabel = date.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "short" });
  return `${dateLabel} · ${greetingForHour(date.getHours())}`;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

const urgencyCopy: Record<Urgency, { label: string; className: string }> = {
  critical: { label: "需要关注", className: "border-destructive/30 bg-destructive/10 text-destructive" },
  warning: { label: "本周安排", className: "border-primary/30 bg-primary/10 text-primary" },
  ok: { label: "已安排", className: "border-border bg-muted text-muted-foreground" },
  past: { label: "已过期", className: "border-border bg-muted text-muted-foreground" }
};

export function DailyBrief({
  childProfiles,
  events,
  onModeChange,
  onSelectChild,
  selectedChildId
}: {
  childProfiles: Child[];
  events: CalendarEvent[];
  onModeChange: (mode: DashboardMode, targetId?: string) => void;
  onSelectChild?: (childId: string) => void;
  selectedChildId?: string | null;
}) {
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  const visibleEvents = selectedChildId ? events.filter((event) => event.childIds.includes(selectedChildId)) : events;
  const upcomingEvents = visibleEvents.filter((event) => new Date(event.startsAt) >= todayStart);
  const todayEvents = upcomingEvents.filter((event) => new Date(event.startsAt) <= todayEnd);
  const nextEvent = upcomingEvents[0];
  const nextUrgency = nextEvent ? getEventUrgency(nextEvent, today) : null;

  function goToChild(childId: string) {
    onSelectChild?.(childId);
  }

  return (
    <section className="rounded-2xl border border-white/50 bg-white/70 p-3 shadow-card backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover dark:border-white/10 dark:bg-white/[0.06] sm:p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
        <button type="button" onClick={() => onModeChange("week", "calendar")} className="group min-w-0 rounded-2xl bg-gradient-to-br from-amber-50/90 via-orange-50/70 to-rose-50/60 p-3.5 text-left transition-colors duration-300 hover:from-amber-100/80 hover:to-rose-100/60 dark:from-white/[0.06] dark:via-white/[0.04] dark:to-white/[0.03] dark:hover:from-white/[0.09] dark:hover:to-white/[0.05] sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              {formatDayLabel(today)}
            </p>
            <div className="flex gap-1.5">
              <span className="rounded-full border border-white/60 bg-white/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground shadow-sm shadow-black/[0.03] backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.08]">
                今日 {todayEvents.length}
              </span>
            </div>
          </div>
          <h2 className="mt-2.5 font-voice text-2xl font-bold leading-snug tracking-tight text-foreground sm:text-[1.7rem]">
            {nextEvent ? "下一项安排" : "今天没有安排"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {nextEvent ? `${formatTime(nextEvent.startsAt)} · ${nextEvent.title}` : "给自己泡杯茶，或者从新增日程开始安排这一天。"}
          </p>

          {nextEvent ? (
            <div className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-white/60 bg-white/80 p-3.5 shadow-sm shadow-black/[0.05] backdrop-blur-sm transition-transform duration-300 group-hover:translate-x-0.5 dark:border-white/10 dark:bg-white/[0.08]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {nextUrgency ? (
                    <Badge variant="outline" className={cn("h-6 rounded-full px-2", urgencyCopy[nextUrgency].className)}>
                      {urgencyCopy[nextUrgency].label}
                    </Badge>
                  ) : null}
                  <span className="text-xs font-medium tabular-nums text-muted-foreground">{formatTime(nextEvent.startsAt)}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-base font-semibold leading-6 text-foreground">{nextEvent.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{nextEvent.location ? nextEvent.location : "点击查看本周安排"}</p>
              </div>
              <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-foreground" />
            </div>
          ) : null}
        </button>

        <div className="rounded-2xl border border-white/50 bg-white/50 p-3 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
          <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">三个孩子</p>
          <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
          {childProfiles.map((child) => {
            const theme = getChildTheme(child);
            const isSelected = selectedChildId === child.id;

            return (
              <button
                key={child.id}
                type="button"
                onClick={() => goToChild(child.id)}
                className={cn(
                  "group/child flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/90 hover:shadow-md hover:shadow-black/[0.06] dark:hover:bg-white/[0.1]",
                  isSelected ? "border-transparent bg-white/90 shadow-md shadow-black/[0.07] ring-2 dark:bg-white/[0.1]" : "border-white/60 bg-white/50 dark:border-white/10 dark:bg-white/[0.05]"
                )}
                style={isSelected ? ({ "--tw-ring-color": theme.hex } as CSSProperties) : undefined}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-2 ring-white/60"
                  style={{ ...theme.avatarBgStyle, ...theme.avatarTextStyle }}
                >
                  {child.firstName.slice(0, 1)}
                </span>
                <div className="hidden min-w-0 flex-1 lg:block">
                  <p className={cn("truncate text-sm text-foreground", isSelected && "font-semibold")}>{child.firstName}</p>
                  <p className="truncate text-xs text-muted-foreground">{child.grade}</p>
                </div>
                <p className={cn("min-w-0 flex-1 truncate text-xs text-foreground lg:hidden", isSelected && "font-semibold")}>{child.firstName}</p>
                <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover/child:translate-x-0.5 lg:block" />
              </button>
            );
          })}
          </div>
        </div>
      </div>
    </section>
  );
}
