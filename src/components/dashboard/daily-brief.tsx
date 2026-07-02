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
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <button type="button" onClick={() => onModeChange("week", "calendar")} className="block w-full min-w-0 p-4 text-left transition hover:bg-muted/50 sm:p-5">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          {formatDayLabel(today)}
        </p>
        <h2 className="mt-2 font-voice text-2xl leading-snug text-foreground sm:text-[1.7rem]">
          {nextEvent ? "今天先看这一件。" : "今天节奏很干净。"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {nextEvent ? "打开后先处理最近事项，再补学习记录和资料。" : "没有紧急事项，可以补一条学习记录，或者看看本周安排。"}
        </p>

        {nextEvent ? (
          <div className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-border bg-muted/60 p-3.5 sm:p-4">
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

      <div className="grid grid-cols-2 gap-2 border-t border-border p-3 sm:p-4">
        <div className="rounded-xl bg-muted/60 p-3">
          <p className="text-xs text-muted-foreground">今日事项</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{todayEvents.length}</p>
        </div>
        <div className="rounded-xl bg-muted/60 p-3">
          <p className="text-xs text-muted-foreground">学习分钟</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{totalMinutes}</p>
        </div>
      </div>

      <div className="border-t border-border p-3 sm:p-4">
        <p className="px-1 pb-2 text-xs text-muted-foreground">三个孩子</p>
        <div className="flex flex-col gap-2">
          {childProfiles.map((child) => {
            const theme = getChildTheme(child);

            return (
              <button
                key={child.id}
                type="button"
                onClick={() => goToChild(child.id)}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition hover:bg-muted/50"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium"
                  style={{ ...theme.avatarBgStyle, ...theme.avatarTextStyle }}
                >
                  {child.firstName.slice(0, 1)}
                </span>
                <p className="min-w-0 flex-1 truncate text-sm text-foreground">{child.firstName}</p>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
