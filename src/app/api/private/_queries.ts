import type { PrivateSupabaseClient } from "@/app/api/private/_utils";

export type RowsResult = {
  data: Record<string, unknown>[] | null;
  error: { message: string } | null;
};

export const emptyRows: RowsResult = { data: [], error: null };

/**
 * The family-scoped education tables that both /snapshot and /export read.
 * Rows are returned raw (select *); callers map or dump them as needed.
 */
export function fetchFamilyEducationRows(
  supabase: PrivateSupabaseClient,
  familyId: string,
  options: { orderGoalsByTargetDate?: boolean } = {}
) {
  return Promise.all([
    supabase.from("children").select("*").eq("family_id", familyId).order("created_at"),
    supabase.from("calendar_events").select("*").eq("family_id", familyId).order("starts_at"),
    supabase.from("learning_records").select("*").eq("family_id", familyId).order("record_date", { ascending: false }),
    options.orderGoalsByTargetDate
      ? supabase.from("education_goals").select("*").eq("family_id", familyId).order("target_date", { nullsFirst: false })
      : supabase.from("education_goals").select("*").eq("family_id", familyId),
    supabase.from("resources").select("*").eq("family_id", familyId).order("updated_at", { ascending: false })
  ]);
}

/** Junction/detail rows keyed by ids collected from the education tables. */
export function fetchLinkedEducationRows(
  supabase: PrivateSupabaseClient,
  ids: { eventIds: string[]; goalIds: string[] }
) {
  return Promise.all([
    ids.eventIds.length
      ? supabase.from("calendar_event_children").select("*").in("event_id", ids.eventIds)
      : Promise.resolve(emptyRows),
    ids.goalIds.length
      ? supabase.from("milestones").select("*").in("goal_id", ids.goalIds).order("sort_order")
      : Promise.resolve(emptyRows)
  ]);
}
