import { ChevronRight, Sparkles } from "lucide-react";
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
  records
}: {
  childProfiles: Child[];
  events: CalendarEvent[];
  onModeChange: (mode: DashboardMode, targetId?: string) => void;
  onSelectChild?: (childId: string) => void;
  records: LearningRecord[];
}) {
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  const upcomingEvents = events.filter((event) => new Date(event.startsAt) >= todayStart);
  const todayEvents = upcomingEvents.filter((event) => new Date(event.startsAt) <= todayEnd);
  const nextEvent = upcomingEvents[0];
  const nextUrgency = nextEvent ? getEventUrgency(nextEvent, today) : null;
  const totalMinutes = records.reduce((sum, record) => sum + record.durationMinutes, 0);

  function goToChild(childId: string) {
    onSelectChild?.(childId);
    onModeChange("records", "children");
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-3 sm:p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
        <button type="button" onClick={() => onModeChange("week", "calendar")} className="min-w-0 rounded-2xl bg-muted/50 p-3 text-left transition hover:bg-muted sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              {formatDayLabel(today)}
            </p>
            <div className="flex gap-1.5">
              <span className="rounded-full border border-border bg-card px-2 py-1 text-[11px] text-muted-foreground">
                今日 {todayEvents.length}
              </span>
              <span className="rounded-full border border-border bg-card px-2 py-1 text-[11px] text-muted-foreground">
                {totalMinutes}m
              </span>
            </div>
          </div>
          <h2 className="mt-2 font-voice text-2xl leading-snug text-foreground sm:text-[1.7rem]">
            {nextEvent ? "今天先看这一件。" : "今天节奏很干净。"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {nextEvent ? "先处理最近事项，再补学习记录和资料。" : "没有紧急事项，可以补一条学习记录，或者看看本周安排。"}
          </p>

          {nextEvent ? (
            <div className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-3.5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {nextUrgency ? (
                    <Badge variant="outline" className={cn("h-6 rounded-full px-2", urgencyCopy[nextUrgency].className)}>
                      {urgencyCopy[nextUrgency].label}
                    </Badge>
                  ) : null}
                  <span className="text-xs font-medium text-muted-foreground">{formatTime(nextEvent.startsAt)}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-base font-medium leading-6 text-foreground">{nextEvent.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{nextEvent.location ? nextEvent.location : "点击查看本周安排"}</p>
              </div>
              <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
            </div>
          ) : null}
        </button>

        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="px-1 pb-2 text-xs font-medium text-muted-foreground">三个孩子</p>
          <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
          {childProfiles.map((child) => {
            const theme = getChildTheme(child);

            return (
              <button
                key={child.id}
                type="button"
                onClick={() => goToChild(child.id)}
                className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-muted/40 px-2.5 py-2 text-left transition hover:bg-muted/70"
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium"
                  style={{ ...theme.avatarBgStyle, ...theme.avatarTextStyle }}
                >
                  {child.firstName.slice(0, 1)}
                </span>
                <div className="hidden min-w-0 flex-1 lg:block">
                  <p className="truncate text-sm text-foreground">{child.firstName}</p>
                  <p className="truncate text-xs text-muted-foreground">{child.grade}</p>
                </div>
                <p className="min-w-0 flex-1 truncate text-xs text-foreground lg:hidden">{child.firstName}</p>
                <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground lg:block" />
              </button>
            );
          })}
          </div>
        </div>
      </div>
    </section>
  );
}
