import { NextResponse } from "next/server";
import { getPrivateWriteContext, jsonError } from "@/app/api/private/_utils";
import type { CalendarEvent, Child, EducationGoal, EventCategory, GoalStatus, LearningRecord, Resource } from "@/lib/types";

type ChildRow = {
  id: string;
  first_name: string;
  last_name: string | null;
  age: number | null;
  grade: string | null;
  school_name: string | null;
  school_program: string | null;
  avatar_color: string;
  interests: string[] | null;
  focus_areas: string[] | null;
};

type EventRow = {
  id: string;
  title: string;
  category: EventCategory;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  description?: string | null;
  recurrence_rule?: string | null;
  recurrence_end?: string | null;
  all_day?: boolean;
};

type EventChildRow = {
  event_id: string;
  child_id: string;
};

type LearningRecordRow = {
  id: string;
  child_id: string;
  subject: string;
  title: string;
  record_date: string;
  duration_minutes: number | null;
  score: number | null;
  max_score?: number | null;
  exam_type?: LearningRecord["examType"] | null;
  notes?: string | null;
  confidence: number | null;
};

type GoalRow = {
  id: string;
  child_id: string;
  title: string;
  subject: string | null;
  target_date: string | null;
  status: GoalStatus;
  progress: number;
  plan_type?: EducationGoal["planType"] | null;
  custom_type?: string | null;
  sync_to_calendar?: boolean;
};

type MilestoneRow = {
  id: string;
  goal_id: string;
  title: string;
  due_date: string | null;
  completed_at: string | null;
};

type ResourceRow = {
  id: string;
  child_id: string | null;
  kind: Resource["kind"];
  title: string;
  subject: string | null;
  tags: string[] | null;
  updated_at: string;
};

function mapChild(row: ChildRow): Child {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name ?? "",
    age: row.age ?? 0,
    grade: row.grade ?? "",
    schoolName: row.school_name ?? "",
    schoolProgram: row.school_program ?? "",
    avatarColor: row.avatar_color,
    interests: row.interests ?? [],
    focusAreas: row.focus_areas ?? []
  };
}

export async function GET() {
  try {
    const { familyId, supabase } = getPrivateWriteContext();
    const [
      familyResult,
      settingsResult,
      childrenResult,
      eventsResult,
      recordsResult,
      goalsResult,
      resourcesResult
    ] = await Promise.all([
      supabase.from("families").select("id,name,timezone,locale").eq("id", familyId).single(),
      supabase.from("family_settings").select("family_id,calendar_name").eq("family_id", familyId).single(),
      supabase.from("children").select("id,first_name,last_name,age,grade,school_name,school_program,avatar_color,interests,focus_areas").eq("family_id", familyId).order("created_at"),
      supabase.from("calendar_events").select("*").eq("family_id", familyId).order("starts_at"),
      supabase.from("learning_records").select("*").eq("family_id", familyId).order("record_date", { ascending: false }),
      supabase.from("education_goals").select("*").eq("family_id", familyId),
      supabase.from("resources").select("id,child_id,kind,title,subject,tags,updated_at").eq("family_id", familyId).order("updated_at", { ascending: false })
    ]);

    for (const result of [familyResult, settingsResult, childrenResult, eventsResult, recordsResult, goalsResult, resourcesResult]) {
      if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    const eventIds = ((eventsResult.data ?? []) as EventRow[]).map((event) => event.id);
    const goalIds = ((goalsResult.data ?? []) as GoalRow[]).map((goal) => goal.id);
    const [eventChildrenResult, milestonesResult] = await Promise.all([
      eventIds.length
        ? supabase.from("calendar_event_children").select("event_id,child_id").in("event_id", eventIds)
        : Promise.resolve({ data: [], error: null }),
      goalIds.length
        ? supabase.from("milestones").select("id,goal_id,title,due_date,completed_at").in("goal_id", goalIds).order("sort_order")
        : Promise.resolve({ data: [], error: null })
    ]);

    for (const result of [eventChildrenResult, milestonesResult]) {
      if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    const childIdsByEvent = new Map<string, string[]>();
    ((eventChildrenResult.data ?? []) as EventChildRow[]).forEach((row) => {
      childIdsByEvent.set(row.event_id, [...(childIdsByEvent.get(row.event_id) ?? []), row.child_id]);
    });

    const milestonesByGoal = new Map<string, MilestoneRow[]>();
    ((milestonesResult.data ?? []) as MilestoneRow[]).forEach((row) => {
      milestonesByGoal.set(row.goal_id, [...(milestonesByGoal.get(row.goal_id) ?? []), row]);
    });

    const family = familyResult.data as { id: string; name: string; timezone: string; locale: string };
    const settings = settingsResult.data as { calendar_name: string };

    const data = {
      workspace: {
        id: family.id,
        name: family.name,
        timezone: family.timezone,
        locale: family.locale,
        calendarName: settings.calendar_name
      },
      children: ((childrenResult.data ?? []) as ChildRow[]).map(mapChild),
      childIntakeProfiles: [],
      calendarEvents: ((eventsResult.data ?? []) as EventRow[]).map(
        (event): CalendarEvent => ({
          id: event.id,
          title: event.title,
          category: event.category,
          startsAt: event.starts_at,
          endsAt: event.ends_at ?? undefined,
          location: event.location ?? "",
          notes: event.description ?? undefined,
          recurrenceRule: event.recurrence_rule ?? undefined,
          recurrenceEnd: event.recurrence_end ?? undefined,
          allDay: Boolean(event.all_day),
          childIds: childIdsByEvent.get(event.id) ?? []
        })
      ),
      learningRecords: ((recordsResult.data ?? []) as LearningRecordRow[]).map(
        (record): LearningRecord => ({
          id: record.id,
          childId: record.child_id,
          subject: record.subject,
          title: record.title,
          date: record.record_date,
          durationMinutes: record.duration_minutes ?? 0,
          score: record.score ?? undefined,
          maxScore: record.max_score ?? undefined,
          examType: record.exam_type ?? "quiz",
          notes: record.notes ?? undefined,
          confidence: record.confidence ?? 3
        })
      ),
      educationGoals: ((goalsResult.data ?? []) as GoalRow[]).map(
        (goal): EducationGoal => ({
          id: goal.id,
          childId: goal.child_id,
          title: goal.title,
          subject: goal.subject ?? "",
          targetDate: goal.target_date ?? "",
          status: goal.status,
          progress: goal.progress,
          planType: goal.plan_type ?? "other",
          customType: goal.custom_type ?? undefined,
          syncToCalendar: goal.sync_to_calendar ?? true,
          milestones: (milestonesByGoal.get(goal.id) ?? []).map((milestone) => ({
            id: milestone.id,
            title: milestone.title,
            dueDate: milestone.due_date ?? "",
            completed: Boolean(milestone.completed_at)
          }))
        })
      ),
      resources: ((resourcesResult.data ?? []) as ResourceRow[]).map(
        (resource): Resource => ({
          id: resource.id,
          childId: resource.child_id ?? undefined,
          kind: resource.kind,
          title: resource.title,
          subject: resource.subject ?? "",
          tags: resource.tags ?? [],
          updatedAt: resource.updated_at
        })
      )
    };

    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
