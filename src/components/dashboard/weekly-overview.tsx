import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CalendarEvent, Child } from "@/lib/types";

const categoryTone: Record<string, string> = {
  school: "bg-blue-500",
  tutoring: "bg-teal-500",
  activity: "bg-amber-500",
  exam: "bg-rose-500",
  family: "bg-slate-500"
};

export function WeeklyOverview({ events, childProfiles }: { events: CalendarEvent[]; childProfiles: Child[] }) {
  const childById = new Map(childProfiles.map((child) => [child.id, child]));

  return (
    <Card id="dashboard" className="border-white/70 bg-white/85 shadow-sm backdrop-blur">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>本周总览</CardTitle>
            <CardDescription>把学校、辅导、活动、测评和家庭复盘放在同一个视图。</CardDescription>
          </div>
          <Badge variant="outline" className="gap-1">
            <CalendarDays className="h-3 w-3" />
            6月22-28日
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {events.map((event) => (
            <div key={event.id} className="rounded-lg border bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${categoryTone[event.category]}`} />
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{event.category}</span>
              </div>
              <p className="mt-3 text-sm font-semibold">{event.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{format(new Date(event.startsAt), "EEE, h:mm a")}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {event.childIds.map((childId) => {
                  const child = childById.get(childId);
                  return (
                    <span key={childId} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {child?.firstName ?? "Family"}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
