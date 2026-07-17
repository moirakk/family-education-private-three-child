import type { CalendarEvent, Child, EventCategory } from "@/lib/types";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function getCalendarFeedByToken(token: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("family_settings").select("family_id").eq("calendar_token", token).maybeSingle();
  if (error || !data?.family_id) return null;
  return getCalendarFeedByFamilyId(data.family_id as string);
}

type CalendarEventRow = {
  id: string;
  title: string;
  category: EventCategory;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  description: string | null;
  recurrence_rule: string | null;
  recurrence_end: string | null;
  all_day: boolean;
};

type GoalCalendarRow = {
  id: string;
  child_id: string;
  title: string;
  target_date: string | null;
  status: string;
  sync_to_calendar: boolean;
};

type ChildRow = {
  id: string;
  first_name: string;
};

type EventChildRow = {
  event_id: string;
  child_id: string;
};

export async function getCalendarFeedByFamilyId(familyId: string) {
  const supabase = getSupabaseAdminClient();
  const [eventsResult, childrenResult, goalsResult] = await Promise.all([
    supabase
      .from("calendar_events")
      .select("id,title,category,starts_at,ends_at,location,description,recurrence_rule,recurrence_end,all_day")
      .eq("family_id", familyId)
      .gte("starts_at", new Date(Date.now() - 18 * 30 * 24 * 60 * 60 * 1000).toISOString())
      .lte("starts_at", new Date(Date.now() + 36 * 30 * 24 * 60 * 60 * 1000).toISOString())
      .order("starts_at"),
    supabase.from("children").select("id,first_name").eq("family_id", familyId).order("created_at"),
    supabase.from("education_goals").select("id,child_id,title,target_date,status,sync_to_calendar").eq("family_id", familyId).eq("sync_to_calendar", true).eq("status", "planned")
  ]);

  if (eventsResult.error || childrenResult.error || goalsResult.error) {
    console.error("Failed to load calendar feed by family", eventsResult.error ?? childrenResult.error ?? goalsResult.error);
    return null;
  }

  const eventRows = (eventsResult.data ?? []) as CalendarEventRow[];
  const eventIds = eventRows.map((event) => event.id);
  const eventChildrenResult = eventIds.length
    ? await supabase.from("calendar_event_children").select("event_id,child_id").in("event_id", eventIds)
    : { data: [], error: null };

  if (eventChildrenResult.error) {
    console.error("Failed to load calendar event children", eventChildrenResult.error);
    return null;
  }

  const children: Child[] = ((childrenResult.data ?? []) as ChildRow[]).map((child) => ({
    id: child.id,
    firstName: child.first_name,
    lastName: "",
    age: 0,
    grade: "",
    schoolName: "",
    schoolProgram: "",
    avatarColor: "#2563eb",
    interests: [],
    focusAreas: []
  }));

  const childIdsByEvent = new Map<string, string[]>();
  ((eventChildrenResult.data ?? []) as EventChildRow[]).forEach((row) => {
    childIdsByEvent.set(row.event_id, [...(childIdsByEvent.get(row.event_id) ?? []), row.child_id]);
  });

  const events: CalendarEvent[] = eventRows.map((event) => ({
    id: event.id,
    title: event.title,
    category: event.category,
    startsAt: event.starts_at,
    endsAt: event.ends_at ?? undefined,
    location: event.location ?? "",
    notes: event.description ?? undefined,
    recurrenceRule: event.recurrence_rule ?? undefined,
    recurrenceEnd: event.recurrence_end ?? undefined,
    allDay: event.all_day,
    childIds: childIdsByEvent.get(event.id) ?? []
  }));

  ((goalsResult.data ?? []) as GoalCalendarRow[]).forEach((goal) => {
    if (!goal.target_date) return;
    events.push({
      id: `goal-${goal.id}`,
      title: goal.title,
      category: "activity",
      startsAt: `${goal.target_date}T00:00:00+09:00`,
      location: "",
      childIds: [goal.child_id],
      allDay: true
    });
  });

  events.sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));

  return { events, children };
}
