import { NextResponse } from "next/server";
import { getAccessRoleFromRequest, getPrivateWriteContext, jsonError } from "@/app/api/private/_utils";

export const maxDuration = 60;

type QueryError = {
  message: string;
};

type QueryResult<T> = {
  data: T[] | null;
  error: QueryError | null;
};

function assertQuery<T>(result: QueryResult<T>) {
  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data ?? [];
}

export async function GET(request: Request) {
  try {
    const role = getAccessRoleFromRequest(request);
    if (role === "tutor" || role === "viewer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { familyId, supabase } = getPrivateWriteContext();
    const [
      familyResult,
      settingsResult,
      childrenResult,
      eventsResult,
      recordsResult,
      goalsResult,
      resourcesResult,
      materialsResult,
      selfEvaluationsResult,
      tutorFeedbackResult
    ] = await Promise.all([
      supabase.from("families").select("*").eq("id", familyId).maybeSingle(),
      supabase.from("family_settings").select("*").eq("family_id", familyId).maybeSingle(),
      supabase.from("children").select("*").eq("family_id", familyId).order("created_at"),
      supabase.from("calendar_events").select("*").eq("family_id", familyId).order("starts_at"),
      supabase.from("learning_records").select("*").eq("family_id", familyId).order("record_date", { ascending: false }),
      supabase.from("education_goals").select("*").eq("family_id", familyId).order("target_date", { nullsFirst: false }),
      supabase.from("resources").select("*").eq("family_id", familyId).order("updated_at", { ascending: false }),
      supabase.from("learning_materials").select("*").eq("family_id", familyId).order("created_at", { ascending: false }),
      supabase.from("self_evaluations").select("*").eq("family_id", familyId).order("evaluation_date", { ascending: false }),
      supabase.from("tutor_feedback").select("*").eq("family_id", familyId).order("session_date", { ascending: false })
    ]);

    for (const result of [
      familyResult,
      settingsResult,
      childrenResult,
      eventsResult,
      recordsResult,
      goalsResult,
      resourcesResult,
      materialsResult,
      selfEvaluationsResult,
      tutorFeedbackResult
    ]) {
      if (result.error) throw new Error(result.error.message);
    }

    const children = (childrenResult.data ?? []) as Array<{ id: string }>;
    const events = (eventsResult.data ?? []) as Array<{ id: string }>;
    const goals = (goalsResult.data ?? []) as Array<{ id: string }>;
    const childIds = children.map((child) => child.id);
    const eventIds = events.map((event) => event.id);
    const goalIds = goals.map((goal) => goal.id);

    const [intakeProfiles, eventChildren, milestones] = await Promise.all([
      childIds.length
        ? supabase.from("child_intake_profiles").select("*").in("child_id", childIds)
        : Promise.resolve({ data: [], error: null } satisfies QueryResult<unknown>),
      eventIds.length
        ? supabase.from("calendar_event_children").select("*").in("event_id", eventIds)
        : Promise.resolve({ data: [], error: null } satisfies QueryResult<unknown>),
      goalIds.length
        ? supabase.from("milestones").select("*").in("goal_id", goalIds).order("sort_order")
        : Promise.resolve({ data: [], error: null } satisfies QueryResult<unknown>)
    ]);

    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      familyId,
      source: "supabase-private-api",
      tables: {
        families: familyResult.data ? [familyResult.data] : [],
        family_settings: settingsResult.data ? [settingsResult.data] : [],
        children: childrenResult.data ?? [],
        child_intake_profiles: assertQuery(intakeProfiles),
        calendar_events: eventsResult.data ?? [],
        calendar_event_children: assertQuery(eventChildren),
        learning_records: recordsResult.data ?? [],
        education_goals: goalsResult.data ?? [],
        milestones: assertQuery(milestones),
        resources: resourcesResult.data ?? [],
        learning_materials: materialsResult.data ?? [],
        self_evaluations: selfEvaluationsResult.data ?? [],
        tutor_feedback: tutorFeedbackResult.data ?? []
      },
      storage: {
        bucket: process.env.SUPABASE_LEARNING_MATERIALS_BUCKET ?? "learning-materials",
        note: "File bodies remain in private Supabase Storage. This export includes database rows and storage paths only."
      }
    };

    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
