"use client";

import { Check } from "lucide-react";
import type { DashboardMode } from "@/components/dashboard/app-shell";
import { getChildTheme } from "@/lib/child-theme";
import type { CalendarEvent, Child } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getEventUrgency, sortEventsByUrgency, type Urgency } from "@/lib/urgency";

const urgencyLabels: Record<Urgency, string> = {
  critical: "重点",
  warning: "本周",
  ok: "提醒",
  past: "已过"
};

const urgencyClasses: Record<Urgency, string> = {
  critical: "border-destructive/30 bg-destructive/10 text-destructive",
  warning: "border-primary/30 bg-primary/10 text-primary",
  ok: "border-border bg-muted text-muted-foreground",
  past: "border-border bg-muted text-muted-foreground"
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
  selectedChildId
}: {
  childProfiles: Child[];
  events: CalendarEvent[];
  onModeChange: (mode: DashboardMode, targetId?: string) => void;
  selectedChildId?: string | null;
}) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const visibleEvents = selectedChildId ? events.filter((event) => event.childIds.includes(selectedChildId)) : events;
  const nextEvents = sortEventsByUrgency(visibleEvents.filter((event) => new Date(event.startsAt) >= todayStart)).slice(0, 3);

  return (
    <section className="rounded-2xl border border-white/50 bg-white/70 p-3 shadow-card backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover dark:border-white/10 dark:bg-white/[0.06] sm:p-4">
      <div className="rounded-2xl border border-white/50 bg-white/40 p-3 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03] sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold tracking-tight text-foreground">下一步提醒</p>
          <button type="button" className="-m-2 min-h-11 rounded-lg p-2 text-xs font-medium text-primary transition-colors duration-200 hover:text-primary/80" onClick={() => onModeChange("week", "calendar")}>查看全部</button>
        </div>

        {nextEvents.length > 0 ? (
          <div className="mt-3 flex flex-col">
            {nextEvents.map((event, index) => {
              const urgency = getEventUrgency(event);
              const singleChild = event.childIds.length === 1 ? childProfiles.find((profile) => profile.id === event.childIds[0]) : null;
              const singleChildTheme = singleChild ? getChildTheme(singleChild) : null;

              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onModeChange("week", "calendar")}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-lg py-2.5 pl-2.5 pr-1.5 text-left transition-colors duration-200 hover:bg-white/80 dark:hover:bg-white/[0.07]",
                    singleChild && "border-l-[3px]",
                    index > 0 && "border-t border-border/60"
                  )}
                  style={singleChildTheme?.borderStyle}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{event.title}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs tabular-nums text-muted-foreground">
                      <span>{formatEventTime(event.startsAt)}</span>
                      {event.childIds.length > 1 && event.childIds.slice(0, 3).map((childId) => {
                        const child = childProfiles.find((profile) => profile.id === childId);
                        const theme = getChildTheme(child);
                        return <span key={childId} className="h-2 w-2 rounded-full ring-1 ring-white/80" style={theme.dotStyle} />;
                      })}
                    </div>
                  </div>
                  <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium", urgencyClasses[urgency])}>
                    {urgencyLabels[urgency]}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-border bg-muted/40 p-4 text-center dark:border-white/15 dark:bg-white/[0.04]">
            <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Check className="h-4 w-4" />
            </span>
            <p className="mt-2 text-sm font-medium text-foreground">一切都安排妥当</p>
            <p className="mt-1 text-xs text-muted-foreground">目前没有需要处理的近期事项，好好享受这段时光。</p>
          </div>
        )}
      </div>
    </section>
  );
}
