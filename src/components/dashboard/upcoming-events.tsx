import { format } from "date-fns";
import { Clock, MapPin } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getChildTheme } from "@/lib/child-theme";
import type { CalendarEvent, Child } from "@/lib/types";

export function UpcomingEvents({ events, childProfiles }: { events: CalendarEvent[]; childProfiles: Child[] }) {
  const childById = new Map(childProfiles.map((child) => [child.id, child]));

  return (
    <Card className="h-full border-border bg-card shadow-none">
      <CardHeader>
        <CardTitle>近期事项</CardTitle>
        <CardDescription>需要家长关注的下一批安排。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {events.slice(0, 4).map((event) => (
          <div key={event.id} className="rounded-xl border border-border bg-muted/50 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">{event.title}</p>
              <span className="rounded-full border border-border bg-card px-2 py-0.5 text-xs capitalize text-muted-foreground">{event.category}</span>
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
            <p className="mt-3 flex flex-wrap gap-1 text-xs text-muted-foreground">
              {event.childIds.map((childId) => {
                const child = childById.get(childId);
                if (!child) return null;
                const theme = getChildTheme(child);
                return (
                  <span key={childId} className="rounded-full bg-card px-2 py-0.5 ring-1 ring-border">
                    <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={theme.dotStyle} />
                    {child.firstName}
                  </span>
                );
              })}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
