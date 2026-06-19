import { createClient } from "@supabase/supabase-js";
import type { CalendarEvent, Child, EventCategory } from "@/lib/types";

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

function getServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return null;

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export async function getCalendarFeedByToken(token: string) {
  const supabase = getServerSupabaseClient();
  if (!supabase) return null;

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
