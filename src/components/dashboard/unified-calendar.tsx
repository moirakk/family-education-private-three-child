import { format } from "date-fns";
import { CalendarRange } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getChildTheme } from "@/lib/child-theme";
import type { CalendarEvent, Child, EventCategory } from "@/lib/types";

const categoryLabels: Record<EventCategory, string> = {
  school: "学校",
  tutoring: "辅导",
  activity: "活动",
  exam: "测评",
  family: "家庭"
};

export function UnifiedCalendar({ events, childProfiles }: { events: CalendarEvent[]; childProfiles: Child[] }) {
  const childById = new Map(childProfiles.map((child) => [child.id, child]));

  return (
    <Card id="calendar">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>统一日历</CardTitle>
            <CardDescription>把每个孩子和全家的教育事项统一成一条事件流。</CardDescription>
          </div>
          <Badge variant="outline" className="gap-1 border-border bg-card">
            <CalendarRange className="h-3 w-3" />
            5 类事项
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 lg:grid-cols-5">
          {(["school", "tutoring", "activity", "exam", "family"] as EventCategory[]).map((category) => (
            <div key={category} className="rounded-xl border border-white/50 bg-white/40 p-3 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-sm font-semibold tracking-tight">{categoryLabels[category]}</p>
              <div className="mt-3 space-y-2">
                {events
                  .filter((event) => event.category === category)
                  .map((event) => (
                    <div key={event.id} className="rounded-xl border border-white/60 bg-white/80 p-3 shadow-sm shadow-black/[0.03] transition-all duration-300 hover:-translate-y-px hover:shadow-md hover:shadow-black/[0.07] dark:border-white/10 dark:bg-white/[0.07]">
                      <p className="text-sm font-medium">{event.title}</p>
                      <p className="mt-1 text-xs tabular-nums text-muted-foreground">{format(new Date(event.startsAt), "EEE h:mm a")}</p>
                      <p className="mt-2 flex flex-wrap gap-1 text-xs text-muted-foreground">
                        {event.childIds.map((childId) => {
                          const child = childById.get(childId);
                          if (!child) return null;
                          const theme = getChildTheme(child);
                          return (
                            <span key={childId} className="rounded-full px-2 py-0.5 font-medium" style={{ ...theme.surfaceStyle, ...theme.avatarTextStyle }}>
                              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={theme.dotStyle} />
                              {child.firstName}
                            </span>
                          );
                        })}
                      </p>
                    </div>
                  ))}
                {!events.some((event) => event.category === category) && (
                  <p className="rounded-xl border border-dashed border-border bg-muted/30 p-3 text-center text-xs text-muted-foreground dark:border-white/15 dark:bg-white/[0.03]">本周暂无事项</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
