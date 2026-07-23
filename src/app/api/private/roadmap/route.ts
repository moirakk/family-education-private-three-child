import { NextResponse } from "next/server";
import {
  assertChildBelongsToFamily,
  numberOrNull,
  optionalString,
  parseBody,
  requireQueryParam,
  supabaseError,
  withPrivateRoute,
  type PrivateSupabaseClient
} from "@/app/api/private/_utils";
import type { EducationGoal, GoalStatus } from "@/lib/types";
import { goalInputSchema } from "@/lib/schemas/goal";

type MilestonePayload = {
  title?: string;
  dueDate?: string;
  completed?: boolean;
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

const allowedStatuses = new Set<GoalStatus>(["planned", "in_progress", "achieved", "at_risk", "cancelled"]);

function cleanStatus(value: unknown): GoalStatus {
  return typeof value === "string" && allowedStatuses.has(value as GoalStatus) ? (value as GoalStatus) : "planned";
}

function cleanProgress(value: unknown) {
  const parsed = numberOrNull(value) ?? 0;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function cleanMilestones(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((milestone, index) => {
      if (!milestone || typeof milestone !== "object") return null;
      const payload = milestone as MilestonePayload;
      const title = optionalString(payload.title);
      if (!title) return null;

      return {
        title,
        due_date: optionalString(payload.dueDate),
        completed_at: payload.completed ? new Date().toISOString() : null,
        sort_order: index
      };
    })
    .filter((milestone): milestone is { title: string; due_date: string | null; completed_at: string | null; sort_order: number } =>
      Boolean(milestone)
    );
}

function mapGoal(goal: GoalRow, milestones: MilestoneRow[]): EducationGoal {
  return {
    id: goal.id,
    childId: goal.child_id,
    title: goal.title,
    subject: goal.subject ?? "",
    targetDate: goal.target_date ?? "",
    status: goal.status,
    progress: goal.progress,
    milestones: milestones.map((milestone) => ({
      id: milestone.id,
      title: milestone.title,
      dueDate: milestone.due_date ?? "",
      completed: Boolean(milestone.completed_at)
    })),
    planType: goal.plan_type ?? "other",
    customType: goal.custom_type ?? undefined,
    syncToCalendar: goal.sync_to_calendar ?? true
  };
}

function goalColumnValues(payload: import("zod").infer<typeof goalInputSchema>) {
  return {
    child_id: payload.childId,
    title: payload.title,
    subject: optionalString(payload.subject),
    target_date: optionalString(payload.targetDate),
    status: cleanStatus(payload.status),
    progress: cleanProgress(payload.progress),
    plan_type: payload.planType ?? "other",
    custom_type: optionalString(payload.customType),
    sync_to_calendar: payload.syncToCalendar !== false
  };
}

async function loadGoalWithMilestones(supabase: PrivateSupabaseClient, familyId: string, goalId: string) {
  const goalResult = await supabase
    .from("education_goals")
    .select("id,child_id,title,subject,target_date,status,progress,plan_type,custom_type,sync_to_calendar")
    .eq("family_id", familyId)
    .eq("id", goalId)
    .single();

  if (goalResult.error) return { error: goalResult.error.message, data: null };

  const milestonesResult = await supabase
    .from("milestones")
    .select("id,goal_id,title,due_date,completed_at")
    .eq("goal_id", goalId)
    .order("sort_order");

  if (milestonesResult.error) return { error: milestonesResult.error.message, data: null };

  return {
    error: null,
    data: mapGoal(goalResult.data as GoalRow, (milestonesResult.data ?? []) as MilestoneRow[])
  };
}

async function insertMilestones(
  supabase: PrivateSupabaseClient,
  goalId: string,
  milestones: ReturnType<typeof cleanMilestones>
) {
  if (milestones.length === 0) return null;

  const result = await supabase.from("milestones").insert(
    milestones.map((milestone) => ({
      goal_id: goalId,
      ...milestone
    }))
  );

  return result.error;
}

export const POST = withPrivateRoute(async ({ familyId, supabase }, request) => {
  const payload = parseBody(goalInputSchema, await request.json());
  const milestones = cleanMilestones(payload.milestones);
  await assertChildBelongsToFamily(supabase, familyId, payload.childId);

  const { data, error } = await supabase
    .from("education_goals")
    .insert({ family_id: familyId, ...goalColumnValues(payload) })
    .select("id")
    .single();

  if (error) return supabaseError(error);

  const goalId = data.id as string;
  const milestoneError = await insertMilestones(supabase, goalId, milestones);
  if (milestoneError) return supabaseError(milestoneError);

  const result = await loadGoalWithMilestones(supabase, familyId, goalId);
  if (result.error || !result.data) return NextResponse.json({ error: result.error ?? "Goal save failed" }, { status: 500 });

  return NextResponse.json({ data: result.data }, { status: 201 });
});

export const PUT = withPrivateRoute(async ({ familyId, supabase }, request) => {
  const payload = parseBody(goalInputSchema, await request.json());
  const milestones = cleanMilestones(payload.milestones);
  await assertChildBelongsToFamily(supabase, familyId, payload.childId);

  const goalId = requireQueryParam(request, "goalId");

  const { data, error } = await supabase
    .from("education_goals")
    .update(goalColumnValues(payload))
    .eq("family_id", familyId)
    .eq("id", goalId)
    .select("id")
    .single();

  if (error) return supabaseError(error);
  if (!data) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

  const deleteMilestones = await supabase.from("milestones").delete().eq("goal_id", goalId);
  if (deleteMilestones.error) return supabaseError(deleteMilestones.error);

  const milestoneError = await insertMilestones(supabase, goalId, milestones);
  if (milestoneError) return supabaseError(milestoneError);

  const result = await loadGoalWithMilestones(supabase, familyId, goalId);
  if (result.error || !result.data) return NextResponse.json({ error: result.error ?? "Goal update failed" }, { status: 500 });

  return NextResponse.json({ data: result.data });
});

export const DELETE = withPrivateRoute(async ({ familyId, supabase }, request) => {
  const goalId = requireQueryParam(request, "goalId");

  const { error } = await supabase.from("education_goals").delete().eq("family_id", familyId).eq("id", goalId);
  if (error) return supabaseError(error);

  return NextResponse.json({ ok: true });
});
