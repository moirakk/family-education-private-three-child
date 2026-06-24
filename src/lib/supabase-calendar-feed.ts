import type { CalendarEvent, Child, EventCategory } from "@/lib/types";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type CalendarFeedRow = {
  event_id: string;
  title: string;
  category: EventCategory;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  child_ids: string[] | null;
  child_names: string[] | null;
};

export async function getCalendarFeedByToken(token: string) {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase.rpc("get_calendar_feed_by_token", {
    feed_token: token
  });

  if (error) {
    console.error("Failed to load calendar feed", error);
    return null;
  }

  const rows = (data ?? []) as CalendarFeedRow[];
  const childMap = new Map<string, Child>();

  const events: CalendarEvent[] = rows.map((row) => {
    const childIds = row.child_ids ?? [];
    const childNames = row.child_names ?? [];

    childIds.forEach((childId, index) => {
      if (childMap.has(childId)) return;
      childMap.set(childId, {
        id: childId,
        firstName: childNames[index] ?? "孩子",
        lastName: "",
        age: 0,
        grade: "",
        schoolName: "",
        schoolProgram: "",
        avatarColor: "#2563eb",
        interests: [],
        focusAreas: []
      });
    });

    return {
      id: row.event_id,
      title: row.title,
      category: row.category,
      startsAt: row.starts_at,
      endsAt: row.ends_at ?? undefined,
      location: row.location ?? "",
      childIds
    };
  });

  return {
    events,
    children: [...childMap.values()]
  };
}

type CalendarEventRow = {
  id: string;
  title: string;
  category: EventCategory;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
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
  const [eventsResult, childrenResult] = await Promise.all([
    supabase
      .from("calendar_events")
      .select("id,title,category,starts_at,ends_at,location")
      .eq("family_id", familyId)
      .gte("starts_at", new Date(Date.now() - 18 * 30 * 24 * 60 * 60 * 1000).toISOString())
      .lte("starts_at", new Date(Date.now() + 36 * 30 * 24 * 60 * 60 * 1000).toISOString())
      .order("starts_at"),
    supabase.from("children").select("id,first_name").eq("family_id", familyId).order("created_at")
  ]);

  if (eventsResult.error || childrenResult.error) {
    console.error("Failed to load calendar feed by family", eventsResult.error ?? childrenResult.error);
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
    childIds: childIdsByEvent.get(event.id) ?? []
  }));

  return { events, children };
}
