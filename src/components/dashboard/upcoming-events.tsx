import { format } from "date-fns";
import { Clock, MapPin } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CalendarEvent, Child } from "@/lib/types";

export function UpcomingEvents({ events, childProfiles }: { events: CalendarEvent[]; childProfiles: Child[] }) {
  const childById = new Map(childProfiles.map((child) => [child.id, child.firstName]));

  return (
    <Card className="h-full border-white/70 bg-white/85 shadow-sm backdrop-blur">
      <CardHeader>
        <CardTitle>近期事项</CardTitle>
        <CardDescription>需要家长关注的下一批安排。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {events.slice(0, 4).map((event) => (
          <div key={event.id} className="rounded-lg border bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">{event.title}</p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-600">{event.category}</span>
            </div>
            <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                {format(new Date(event.startsAt), "EEE, MMM d, h:mm a")}
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" />
                {event.location}
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {event.childIds.map((childId) => childById.get(childId)).filter(Boolean).join(", ")}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
