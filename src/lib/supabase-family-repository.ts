"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChildIntakeProfile, FamilyRepository, FamilySnapshot } from "@/lib/core-types";
import type { CalendarEvent, Child, EducationGoal, EventCategory, GoalStatus, LearningRecord, Resource } from "@/lib/types";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type FamilyRow = {
  id: string;
  name: string;
  timezone: string;
  locale: string;
};

type FamilySettingsRow = {
  family_id: string;
  calendar_name: string;
};

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

type IntakeRow = {
  child_id: string;
  school_detail: string | null;
  weekly_schedule: string | null;
  important_dates: string | null;
  current_goals: string | null;
  parent_concerns: string | null;
  private_notes: string | null;
  updated_at: string | null;
};

type EventRow = {
  id: string;
  title: string;
  category: EventCategory;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
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

function assertNoError(error: { message: string } | null, context: string) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

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

function mapIntake(row: IntakeRow): ChildIntakeProfile {
  return {
    childId: row.child_id,
    schoolDetail: row.school_detail ?? "",
    weeklySchedule: row.weekly_schedule ?? "",
    importantDates: row.important_dates ?? "",
    currentGoals: row.current_goals ?? "",
    parentConcerns: row.parent_concerns ?? "",
    privateNotes: row.private_notes ?? "",
    updatedAt: row.updated_at ?? undefined
  };
}

function mapEvent(row: EventRow, childIds: string[]): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    startsAt: row.starts_at,
    endsAt: row.ends_at ?? undefined,
    location: row.location ?? "",
    childIds
  };
}

export class SupabaseFamilyRepository implements FamilyRepository {
  private readonly supabase: SupabaseClient;

  constructor(supabase: SupabaseClient = getSupabaseBrowserClient()) {
    this.supabase = supabase;
  }

  async getSnapshot(familyId: string): Promise<FamilySnapshot> {
    const [
      familyResult,
      settingsResult,
      childrenResult,
      intakeResult,
      eventsResult,
      recordsResult,
      goalsResult,
      resourcesResult
    ] = await Promise.all([
      this.supabase.from("families").select("id,name,timezone,locale").eq("id", familyId).single(),
      this.supabase.from("family_settings").select("family_id,calendar_name").eq("family_id", familyId).single(),
      this.supabase.from("children").select("id,first_name,last_name,age,grade,school_name,school_program,avatar_color,interests,focus_areas").eq("family_id", familyId).order("created_at"),
      this.supabase.from("child_intake_profiles").select("child_id,school_detail,weekly_schedule,important_dates,current_goals,parent_concerns,private_notes,updated_at"),
      this.supabase.from("calendar_events").select("id,title,category,starts_at,ends_at,location").eq("family_id", familyId).order("starts_at"),
      this.supabase.from("learning_records").select("id,child_id,subject,title,record_date,duration_minutes,score,confidence").eq("family_id", familyId).order("record_date", { ascending: false }),
      this.supabase.from("education_goals").select("id,child_id,title,subject,target_date,status,progress").eq("family_id", familyId),
      this.supabase.from("resources").select("id,child_id,kind,title,subject,tags,updated_at").eq("family_id", familyId).order("updated_at", { ascending: false })
    ]);

    assertNoError(familyResult.error, "Load family");
    assertNoError(settingsResult.error, "Load family settings");
    assertNoError(childrenResult.error, "Load children");
    assertNoError(intakeResult.error, "Load intake profiles");
    assertNoError(eventsResult.error, "Load calendar events");
    assertNoError(recordsResult.error, "Load learning records");
    assertNoError(goalsResult.error, "Load education goals");
    assertNoError(resourcesResult.error, "Load resources");

    const eventIds = ((eventsResult.data ?? []) as EventRow[]).map((event) => event.id);
    const goalIds = ((goalsResult.data ?? []) as GoalRow[]).map((goal) => goal.id);
    const [eventChildrenResult, milestonesResult] = await Promise.all([
      eventIds.length
        ? this.supabase.from("calendar_event_children").select("event_id,child_id").in("event_id", eventIds)
        : Promise.resolve({ data: [], error: null }),
      goalIds.length
        ? this.supabase.from("milestones").select("id,goal_id,title,due_date,completed_at").in("goal_id", goalIds).order("sort_order")
        : Promise.resolve({ data: [], error: null })
    ]);

    assertNoError(eventChildrenResult.error, "Load event child links");
    assertNoError(milestonesResult.error, "Load milestones");

    const family = familyResult.data as FamilyRow;
    const settings = settingsResult.data as FamilySettingsRow;
    const children = ((childrenResult.data ?? []) as ChildRow[]).map(mapChild);
    const childIdsByEvent = new Map<string, string[]>();

    ((eventChildrenResult.data ?? []) as EventChildRow[]).forEach((row) => {
      const current = childIdsByEvent.get(row.event_id) ?? [];
      childIdsByEvent.set(row.event_id, [...current, row.child_id]);
    });

    const milestonesByGoal = new Map<string, MilestoneRow[]>();
    ((milestonesResult.data ?? []) as MilestoneRow[]).forEach((row) => {
      const current = milestonesByGoal.get(row.goal_id) ?? [];
      milestonesByGoal.set(row.goal_id, [...current, row]);
    });

    const educationGoals: EducationGoal[] = ((goalsResult.data ?? []) as GoalRow[]).map((goal) => ({
      id: goal.id,
      childId: goal.child_id,
      title: goal.title,
      subject: goal.subject ?? "",
      targetDate: goal.target_date ?? "",
      status: goal.status,
      progress: goal.progress,
      milestones: (milestonesByGoal.get(goal.id) ?? []).map((milestone) => ({
        id: milestone.id,
        title: milestone.title,
        dueDate: milestone.due_date ?? "",
        completed: Boolean(milestone.completed_at)
      }))
    }));

    return {
      workspace: {
        id: family.id,
        name: family.name,
        timezone: family.timezone,
        locale: family.locale,
        calendarName: settings.calendar_name
      },
      children,
      childIntakeProfiles: ((intakeResult.data ?? []) as IntakeRow[]).map(mapIntake),
      calendarEvents: ((eventsResult.data ?? []) as EventRow[]).map((event) =>
        mapEvent(event, childIdsByEvent.get(event.id) ?? [])
      ),
      learningRecords: ((recordsResult.data ?? []) as LearningRecordRow[]).map((record): LearningRecord => ({
        id: record.id,
        childId: record.child_id,
        subject: record.subject,
        title: record.title,
        date: record.record_date,
        durationMinutes: record.duration_minutes ?? 0,
        score: record.score ?? undefined,
        confidence: record.confidence ?? 3
      })),
      educationGoals,
      resources: ((resourcesResult.data ?? []) as ResourceRow[]).map((resource): Resource => ({
        id: resource.id,
        childId: resource.child_id ?? undefined,
        kind: resource.kind,
        title: resource.title,
        subject: resource.subject ?? "",
        tags: resource.tags ?? [],
        updatedAt: resource.updated_at
      }))
    };
  }

  async saveChildIntakeProfile(profile: ChildIntakeProfile) {
    const { error } = await this.supabase.from("child_intake_profiles").upsert({
      child_id: profile.childId,
      school_detail: profile.schoolDetail,
      weekly_schedule: profile.weeklySchedule,
      important_dates: profile.importantDates,
      current_goals: profile.currentGoals,
      parent_concerns: profile.parentConcerns,
      private_notes: profile.privateNotes,
      updated_at: new Date().toISOString()
    });

    assertNoError(error, "Save intake profile");
    return profile;
  }

  async createCalendarEvent(event: Omit<CalendarEvent, "id">) {
    const familyId = process.env.NEXT_PUBLIC_PRIVATE_FAMILY_ID;
    if (!familyId) throw new Error("Missing NEXT_PUBLIC_PRIVATE_FAMILY_ID");

    const { data, error } = await this.supabase
      .from("calendar_events")
      .insert({
        family_id: familyId,
        title: event.title,
        category: event.category,
        source: "parent",
        starts_at: event.startsAt,
        ends_at: event.endsAt ?? null,
        location: event.location
      })
      .select("id,title,category,starts_at,ends_at,location")
      .single();

    assertNoError(error, "Create calendar event");
    const created = data as EventRow;

    if (event.childIds.length > 0) {
      const { error: linkError } = await this.supabase.from("calendar_event_children").insert(
        event.childIds.map((childId) => ({
          event_id: created.id,
          child_id: childId
        }))
      );

      assertNoError(linkError, "Create event child links");
    }

    return mapEvent(created, event.childIds);
  }

  async deleteCalendarEvent(eventId: string) {
    const { error } = await this.supabase.from("calendar_events").delete().eq("id", eventId);
    assertNoError(error, "Delete calendar event");
  }
}
