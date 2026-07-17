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
    <section className="rounded-2xl border border-border bg-card p-3 sm:p-4">
      <div className="rounded-2xl border border-border bg-muted/40 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-foreground">下一步提醒</p>
          <button type="button" className="text-xs font-medium text-primary" onClick={() => onModeChange("week", "calendar")}>查看全部</button>
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
                    "flex items-center gap-3 py-2.5 pl-2 text-left transition hover:bg-muted/40",
                    singleChild && "border-l-[3px]",
                    index > 0 && "border-t border-border"
                  )}
                  style={singleChildTheme?.borderStyle}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{event.title}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatEventTime(event.startsAt)}</span>
                      {event.childIds.length > 1 && event.childIds.slice(0, 3).map((childId) => {
                        const child = childProfiles.find((profile) => profile.id === childId);
                        const theme = getChildTheme(child);
                        return <span key={childId} className="h-1.5 w-1.5 rounded-full" style={theme.dotStyle} />;
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
          <div className="mt-3 rounded-xl bg-muted/60 p-3">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="h-3.5 w-3.5" />
              暂无近期提醒
            </p>
            <p className="mt-1 pl-[22px] text-xs text-muted-foreground">目前没有需要处理的近期事项。</p>
          </div>
        )}
      </div>
    </section>
  );
}
