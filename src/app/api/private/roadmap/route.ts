import { NextResponse } from "next/server";
import { assertChildBelongsToFamily, getPrivateWriteContext, jsonError, numberOrNull, optionalString, requireString } from "@/app/api/private/_utils";
import type { EducationGoal, GoalStatus } from "@/lib/types";

type MilestonePayload = {
  title?: string;
  dueDate?: string;
  completed?: boolean;
};

type GoalPayload = {
  childId?: string;
  title?: string;
  subject?: string;
  targetDate?: string;
  status?: GoalStatus;
  progress?: number;
  milestones?: MilestonePayload[];
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

const allowedStatuses = new Set<GoalStatus>(["planned", "in_progress", "achieved", "at_risk"]);

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
    }))
  };
}

async function loadGoalWithMilestones(
  supabase: ReturnType<typeof getPrivateWriteContext>["supabase"],
  familyId: string,
  goalId: string
) {
  const goalResult = await supabase
    .from("education_goals")
    .select("id,child_id,title,subject,target_date,status,progress")
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

export async function POST(request: Request) {
  try {
    const { familyId, supabase } = getPrivateWriteContext();
    const payload = (await request.json()) as GoalPayload;
    const childId = requireString(payload.childId, "childId");
    const title = requireString(payload.title, "title");
    const milestones = cleanMilestones(payload.milestones);
    await assertChildBelongsToFamily(supabase, familyId, childId);

    const { data, error } = await supabase
      .from("education_goals")
      .insert({
        family_id: familyId,
        child_id: childId,
        title,
        subject: optionalString(payload.subject),
        target_date: optionalString(payload.targetDate),
        status: cleanStatus(payload.status),
        progress: cleanProgress(payload.progress)
      })
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const goalId = data.id as string;
    if (milestones.length > 0) {
      const insertMilestones = await supabase.from("milestones").insert(
        milestones.map((milestone) => ({
          goal_id: goalId,
          ...milestone
        }))
      );
      if (insertMilestones.error) return NextResponse.json({ error: insertMilestones.error.message }, { status: 500 });
    }

    const result = await loadGoalWithMilestones(supabase, familyId, goalId);
    if (result.error || !result.data) return NextResponse.json({ error: result.error ?? "Goal save failed" }, { status: 500 });

    return NextResponse.json({ data: result.data }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const { familyId, supabase } = getPrivateWriteContext();
    const goalId = new URL(request.url).searchParams.get("goalId");
    const payload = (await request.json()) as GoalPayload;
    const childId = requireString(payload.childId, "childId");
    const title = requireString(payload.title, "title");
    const milestones = cleanMilestones(payload.milestones);
    await assertChildBelongsToFamily(supabase, familyId, childId);

    if (!goalId) return NextResponse.json({ error: "goalId is required" }, { status: 400 });

    const { data, error } = await supabase
      .from("education_goals")
      .update({
        child_id: childId,
        title,
        subject: optionalString(payload.subject),
        target_date: optionalString(payload.targetDate),
        status: cleanStatus(payload.status),
        progress: cleanProgress(payload.progress)
      })
      .eq("family_id", familyId)
      .eq("id", goalId)
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

    const deleteMilestones = await supabase.from("milestones").delete().eq("goal_id", goalId);
    if (deleteMilestones.error) return NextResponse.json({ error: deleteMilestones.error.message }, { status: 500 });

    if (milestones.length > 0) {
      const insertMilestones = await supabase.from("milestones").insert(
        milestones.map((milestone) => ({
          goal_id: goalId,
          ...milestone
        }))
      );
      if (insertMilestones.error) return NextResponse.json({ error: insertMilestones.error.message }, { status: 500 });
    }

    const result = await loadGoalWithMilestones(supabase, familyId, goalId);
    if (result.error || !result.data) return NextResponse.json({ error: result.error ?? "Goal update failed" }, { status: 500 });

    return NextResponse.json({ data: result.data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { familyId, supabase } = getPrivateWriteContext();
    const goalId = new URL(request.url).searchParams.get("goalId");
    if (!goalId) return NextResponse.json({ error: "goalId is required" }, { status: 400 });

    const { error } = await supabase.from("education_goals").delete().eq("family_id", familyId).eq("id", goalId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
