import { format } from "date-fns";
import { CalendarRange } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CalendarEvent, Child, EventCategory } from "@/lib/types";

const categoryLabels: Record<EventCategory, string> = {
  school: "学校",
  tutoring: "辅导",
  activity: "活动",
  exam: "测评",
  family: "家庭"
};

export function UnifiedCalendar({ events, childProfiles }: { events: CalendarEvent[]; childProfiles: Child[] }) {
  const childById = new Map(childProfiles.map((child) => [child.id, child.firstName]));

  return (
    <Card id="calendar" className="border-white/70 bg-white/85 shadow-sm backdrop-blur">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>统一日历</CardTitle>
            <CardDescription>把每个孩子和全家的教育事项统一成一条事件流。</CardDescription>
          </div>
          <Badge variant="outline" className="gap-1">
            <CalendarRange className="h-3 w-3" />
            5 类事项
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 lg:grid-cols-5">
          {(["school", "tutoring", "activity", "exam", "family"] as EventCategory[]).map((category) => (
            <div key={category} className="rounded-lg border bg-white p-3">
              <p className="text-sm font-semibold">{categoryLabels[category]}</p>
              <div className="mt-3 space-y-2">
                {events
                  .filter((event) => event.category === category)
                  .map((event) => (
                    <div key={event.id} className="rounded-md bg-slate-50 p-3">
                      <p className="text-sm font-medium">{event.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{format(new Date(event.startsAt), "EEE h:mm a")}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {event.childIds.map((childId) => childById.get(childId)).filter(Boolean).join(", ")}
                      </p>
                    </div>
                  ))}
                {!events.some((event) => event.category === category) && (
                  <p className="rounded-md bg-slate-50 p-3 text-xs text-muted-foreground">本周暂无事项</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
