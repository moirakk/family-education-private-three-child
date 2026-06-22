"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, Circle, Flag, Pencil, Plus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { deletePrivateApi, isPrivateApiMode, postPrivateApi, putPrivateApi } from "@/lib/private-api-client";
import type { Child, EducationGoal, GoalStatus } from "@/lib/types";

type GoalFormState = {
  childId: string;
  title: string;
  subject: string;
  targetDate: string;
  status: GoalStatus;
  progress: string;
  milestonesText: string;
};

const statusOptions: { value: GoalStatus; label: string }[] = [
  { value: "planned", label: "计划中" },
  { value: "in_progress", label: "推进中" },
  { value: "achieved", label: "已达成" },
  { value: "at_risk", label: "需关注" }
];

const statusLabels: Record<GoalStatus, string> = {
  planned: "计划中",
  in_progress: "推进中",
  achieved: "已达成",
  at_risk: "需关注"
};

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function createInitialForm(childProfiles: Child[]): GoalFormState {
  return {
    childId: childProfiles[0]?.id ?? "",
    title: "",
    subject: "",
    targetDate: todayDate(),
    status: "planned",
    progress: "0",
    milestonesText: ""
  };
}

function formatDate(value: string, pattern: string) {
  if (!value) return "待定";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "待定" : format(date, pattern);
}

function serializeMilestones(goal: EducationGoal) {
  return goal.milestones
    .map((milestone) => `${milestone.dueDate || todayDate()} | ${milestone.title}${milestone.completed ? " | done" : ""}`)
    .join("\n");
}

function parseMilestones(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const parts = line.split("|").map((part) => part.trim());
      const looksLikeDate = /^\d{4}-\d{2}-\d{2}$/.test(parts[0] ?? "");
      const dueDate = looksLikeDate ? parts[0] : "";
      const title = looksLikeDate ? parts[1] : parts[0];
      const completedMarker = looksLikeDate ? parts[2] : parts[1];

      return {
        id: `local-milestone-${Date.now()}-${index}`,
        title: title || "待补充里程碑",
        dueDate,
        completed: ["done", "完成", "yes", "true"].includes((completedMarker ?? "").toLowerCase())
      };
    });
}

function buildGoalFromForm(form: GoalFormState, goalId?: string): EducationGoal {
  return {
    id: goalId ?? `local-goal-${Date.now()}`,
    childId: form.childId,
    title: form.title.trim(),
    subject: form.subject.trim() || "综合规划",
    targetDate: form.targetDate || todayDate(),
    status: form.status,
    progress: Math.min(100, Math.max(0, Number(form.progress) || 0)),
    milestones: parseMilestones(form.milestonesText)
  };
}

export function EducationRoadmap({
  goals,
  childProfiles,
  onGoalsChange
}: {
  goals: EducationGoal[];
  childProfiles: Child[];
  onGoalsChange?: (goals: EducationGoal[]) => void;
}) {
  const [roadmapGoals, setRoadmapGoals] = useState<EducationGoal[]>(goals);
  const [form, setForm] = useState<GoalFormState>(() => createInitialForm(childProfiles));
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState("");

  useEffect(() => {
    setRoadmapGoals(goals);
  }, [goals]);

  useEffect(() => {
    onGoalsChange?.(roadmapGoals);
  }, [onGoalsChange, roadmapGoals]);

  const childById = useMemo(() => new Map(childProfiles.map((child) => [child.id, child.firstName])), [childProfiles]);

  function resetForm() {
    setForm(createInitialForm(childProfiles));
    setEditingGoalId(null);
  }

  function updateGoals(nextGoals: EducationGoal[]) {
    const sortedGoals = [...nextGoals].sort((a, b) => +new Date(a.targetDate) - +new Date(b.targetDate));
    setRoadmapGoals(sortedGoals);
    onGoalsChange?.(sortedGoals);
  }

  function editGoal(goal: EducationGoal) {
    setEditingGoalId(goal.id);
    setForm({
      childId: goal.childId,
      title: goal.title,
      subject: goal.subject,
      targetDate: goal.targetDate || todayDate(),
      status: goal.status,
      progress: String(goal.progress),
      milestonesText: serializeMilestones(goal)
    });
    setSyncStatus("");
  }

  async function saveGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.childId || !form.title.trim()) return;

    const previousGoals = roadmapGoals;
    const nextGoal = buildGoalFromForm(form, editingGoalId ?? undefined);

    if (editingGoalId) {
      updateGoals(roadmapGoals.map((goal) => (goal.id === editingGoalId ? nextGoal : goal)));
      resetForm();

      if (isPrivateApiMode() && !editingGoalId.startsWith("local-")) {
        try {
          setSyncStatus("正在同步路线图修改...");
          const savedGoal = await putPrivateApi<EducationGoal>(
            `/api/private/roadmap?goalId=${encodeURIComponent(editingGoalId)}`,
            nextGoal
          );
          updateGoals(previousGoals.map((goal) => (goal.id === editingGoalId ? savedGoal : goal)));
          setSyncStatus("路线图修改已同步到数据库。");
        } catch (error) {
          updateGoals(previousGoals);
          setSyncStatus(error instanceof Error ? `修改失败，已恢复：${error.message}` : "修改失败，已恢复。");
        }
      }
      return;
    }

    updateGoals([nextGoal, ...roadmapGoals]);
    resetForm();

    if (!isPrivateApiMode()) return;

    try {
      setSyncStatus("正在同步新目标到数据库...");
      const savedGoal = await postPrivateApi<EducationGoal>("/api/private/roadmap", nextGoal);
      updateGoals(roadmapGoals.map((goal) => goal.id === nextGoal.id ? savedGoal : goal).concat(savedGoal).filter((goal, index, all) => all.findIndex((item) => item.id === goal.id) === index));
      setSyncStatus("新目标已同步到数据库。");
    } catch (error) {
      setSyncStatus(error instanceof Error ? `本机已保存，数据库同步失败：${error.message}` : "本机已保存，数据库同步失败。");
    }
  }

  async function deleteGoal(goalId: string) {
    const previousGoals = roadmapGoals;
    updateGoals(roadmapGoals.filter((goal) => goal.id !== goalId));
    if (editingGoalId === goalId) resetForm();

    if (isPrivateApiMode() && !goalId.startsWith("local-")) {
      try {
        setSyncStatus("正在从数据库删除目标...");
        await deletePrivateApi(`/api/private/roadmap?goalId=${encodeURIComponent(goalId)}`);
        setSyncStatus("目标已从数据库删除。");
      } catch (error) {
        updateGoals(previousGoals);
        setSyncStatus(error instanceof Error ? `删除失败，已恢复：${error.message}` : "删除失败，已恢复。");
      }
    }
  }

  return (
    <Card id="roadmap" className="border-white/70 bg-white/85 shadow-sm backdrop-blur">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>教育路线图</CardTitle>
            <CardDescription>按孩子管理目标、里程碑和测评准备节奏。</CardDescription>
          </div>
          <Badge variant="success" className="gap-1">
            <Flag className="h-3 w-3" />
            {roadmapGoals.length} 条路线
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <form onSubmit={saveGoal} className="rounded-lg border bg-white p-4">
          <div className="grid gap-3">
            {editingGoalId && (
              <div className="flex items-center justify-between gap-3 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">
                正在编辑路线
                <button type="button" onClick={resetForm} className="inline-flex items-center gap-1 text-xs font-medium">
                  <X className="h-3.5 w-3.5" />
                  取消
                </button>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="space-y-1.5">
                <Label>孩子</Label>
                <Select value={form.childId} onValueChange={(value) => setForm((current) => ({ ...current, childId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择孩子" />
                  </SelectTrigger>
                  <SelectContent>
                    {childProfiles.map((child) => (
                      <SelectItem key={child.id} value={child.id}>
                        {child.firstName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="goal-date">目标日期</Label>
                <Input
                  id="goal-date"
                  type="date"
                  value={form.targetDate}
                  onChange={(event) => setForm((current) => ({ ...current, targetDate: event.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-title">目标</Label>
              <Input
                id="goal-title"
                placeholder="例如：初一适应与数学基础稳定"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="space-y-1.5">
                <Label htmlFor="goal-subject">领域</Label>
                <Input
                  id="goal-subject"
                  placeholder="数学 / 英语 / 综合"
                  value={form.subject}
                  onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>状态</Label>
                <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value as GoalStatus }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-progress">进度百分比</Label>
              <Input
                id="goal-progress"
                type="number"
                min="0"
                max="100"
                value={form.progress}
                onChange={(event) => setForm((current) => ({ ...current, progress: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-milestones">里程碑</Label>
              <Textarea
                id="goal-milestones"
                rows={5}
                placeholder={"2026-07-15 | 完成入学准备清单\n2026-08-20 | 第一次阶段复盘 | done"}
                value={form.milestonesText}
                onChange={(event) => setForm((current) => ({ ...current, milestonesText: event.target.value }))}
              />
              <p className="text-xs text-muted-foreground">每行：日期 | 事项 | done，可不写 done。</p>
            </div>
            <Button type="submit" className="gap-2">
              <Plus className="h-4 w-4" />
              {editingGoalId ? "保存修改" : "新增目标"}
            </Button>
            {syncStatus && <p className="text-xs text-muted-foreground">{syncStatus}</p>}
          </div>
        </form>

        <div className="grid gap-4 lg:grid-cols-2">
          {roadmapGoals.map((goal) => (
            <div key={goal.id} className="rounded-lg border bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{goal.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {childById.get(goal.childId) ?? "未分配"} · {goal.subject || "综合规划"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Badge variant={goal.status === "at_risk" ? "warning" : goal.status === "planned" ? "outline" : "secondary"}>
                    {statusLabels[goal.status]}
                  </Badge>
                  <Button type="button" variant="ghost" size="icon" onClick={() => editGoal(goal)} aria-label="编辑路线">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => void deleteGoal(goal.id)} aria-label="删除路线">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>目标 {formatDate(goal.targetDate, "MMM d")}</span>
                <span>{goal.progress}%</span>
              </div>
              <Progress value={goal.progress} className="mt-2" />
              <div className="mt-4 space-y-3">
                {goal.milestones.length === 0 ? (
                  <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-muted-foreground">暂无里程碑，家长会议后可补充。</p>
                ) : (
                  goal.milestones.map((milestone) => (
                    <div key={milestone.id} className="flex items-start gap-2 text-sm">
                      {milestone.completed ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                      ) : (
                        <Circle className="mt-0.5 h-4 w-4 text-slate-300" />
                      )}
                      <div>
                        <p className="font-medium">{milestone.title}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(milestone.dueDate, "MMM d, yyyy")}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
