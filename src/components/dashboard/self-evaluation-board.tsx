"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Pencil, SmilePlus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { deletePrivateApi, getPrivateApi, isPrivateApiMode, postPrivateApi, putPrivateApi } from "@/lib/private-api-client";
import type { Child, SelfEvaluation } from "@/lib/types";
import { cn } from "@/lib/utils";

type EvaluationFormState = {
  childId: string;
  evaluationDate: string;
  subject: string;
  mood: string;
  effort: string;
  confidence: string;
  reflection: string;
  nextStep: string;
};

const storageKey = "family-education-private-self-evaluations-v1";
const quickSubjects = ["数学", "英语", "阅读", "语文", "综合"];
const scoreOptions = [
  { value: "1", label: "很卡" },
  { value: "2", label: "有点难" },
  { value: "3", label: "还可以" },
  { value: "4", label: "不错" },
  { value: "5", label: "很稳" }
];

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function clampScore(value: string) {
  return Math.min(5, Math.max(1, Number(value) || 3));
}

function createInitialForm(childProfiles: Child[]): EvaluationFormState {
  return {
    childId: childProfiles[0]?.id ?? "",
    evaluationDate: todayDate(),
    subject: "",
    mood: "3",
    effort: "3",
    confidence: "3",
    reflection: "",
    nextStep: ""
  };
}

export function SelfEvaluationBoard({ childProfiles }: { childProfiles: Child[] }) {
  const [evaluations, setEvaluations] = useState<SelfEvaluation[]>([]);
  const [form, setForm] = useState<EvaluationFormState>(() => createInitialForm(childProfiles));
  const [syncStatus, setSyncStatus] = useState("");
  const [editingEvaluationId, setEditingEvaluationId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;

    try {
      setEvaluations(JSON.parse(raw) as SelfEvaluation[]);
    } catch {
      setEvaluations([]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(evaluations));
  }, [evaluations]);

  useEffect(() => {
    if (!isPrivateApiMode()) return;

    getPrivateApi<SelfEvaluation[]>("/api/private/self-evaluations")
      .then((remoteEvaluations) => {
        setEvaluations((current) => {
          const localOnly = current.filter((evaluation) => evaluation.id.startsWith("local-"));
          return [...remoteEvaluations, ...localOnly];
        });
      })
      .catch((error) => {
        setSyncStatus(error instanceof Error ? `自评读取数据库失败：${error.message}` : "自评读取数据库失败。");
      });
  }, []);

  const childById = useMemo(() => new Map(childProfiles.map((child) => [child.id, child.firstName])), [childProfiles]);

  function resetForm() {
    setForm(createInitialForm(childProfiles));
    setEditingEvaluationId(null);
    setShowAdvanced(false);
  }

  function editEvaluation(evaluation: SelfEvaluation) {
    setEditingEvaluationId(evaluation.id);
    setForm({
      childId: evaluation.childId,
      evaluationDate: evaluation.evaluationDate,
      subject: evaluation.subject,
      mood: String(evaluation.mood),
      effort: String(evaluation.effort),
      confidence: String(evaluation.confidence),
      reflection: evaluation.reflection,
      nextStep: evaluation.nextStep
    });
    setSyncStatus("");
    setShowAdvanced(true);
  }

  async function saveEvaluation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.childId || !form.subject.trim() || !form.reflection.trim()) return;

    const nextEvaluation: SelfEvaluation = {
      id: `local-self-evaluation-${Date.now()}`,
      childId: form.childId,
      evaluationDate: form.evaluationDate || todayDate(),
      subject: form.subject.trim(),
      mood: clampScore(form.mood),
      effort: clampScore(form.effort),
      confidence: clampScore(form.confidence),
      reflection: form.reflection.trim(),
      nextStep: form.nextStep.trim(),
      createdAt: new Date().toISOString()
    };

    if (editingEvaluationId) {
      const previousEvaluations = evaluations;
      const updatedEvaluation = {
        ...nextEvaluation,
        id: editingEvaluationId,
        createdAt: evaluations.find((evaluation) => evaluation.id === editingEvaluationId)?.createdAt ?? nextEvaluation.createdAt
      };
      setEvaluations((current) => current.map((evaluation) => (evaluation.id === editingEvaluationId ? updatedEvaluation : evaluation)));
      resetForm();

      if (isPrivateApiMode() && !editingEvaluationId.startsWith("local-")) {
        try {
          setSyncStatus("正在同步自评修改...");
          const data = await putPrivateApi<SelfEvaluation>(
            `/api/private/self-evaluations?evaluationId=${encodeURIComponent(editingEvaluationId)}`,
            updatedEvaluation
          );
          setEvaluations((current) => current.map((evaluation) => (evaluation.id === editingEvaluationId ? data : evaluation)));
          setSyncStatus("自评修改已同步到数据库。");
        } catch (error) {
          setEvaluations(previousEvaluations);
          setSyncStatus(error instanceof Error ? `修改失败，已恢复：${error.message}` : "修改失败，已恢复。");
        }
      }
      return;
    }

    setEvaluations((current) => [nextEvaluation, ...current]);
    resetForm();

    if (!isPrivateApiMode()) return;

    try {
      setSyncStatus("正在同步到数据库...");
      const data = await postPrivateApi<SelfEvaluation>("/api/private/self-evaluations", nextEvaluation);

      setEvaluations((current) =>
        current.map((evaluation) => (evaluation.id === nextEvaluation.id ? data : evaluation))
      );
      setSyncStatus("已同步到数据库。");
    } catch (error) {
      setSyncStatus(error instanceof Error ? `本机已保存，数据库同步失败：${error.message}` : "本机已保存，数据库同步失败。");
    }
  }

  async function deleteEvaluation(evaluationId: string) {
    setEvaluations((current) => current.filter((evaluation) => evaluation.id !== evaluationId));
    if (isPrivateApiMode() && !evaluationId.startsWith("local-")) {
      await deletePrivateApi(`/api/private/self-evaluations?evaluationId=${encodeURIComponent(evaluationId)}`);
    }
  }

  return (
    <Card id="self-evaluation" className="border-border bg-card shadow-none">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <SmilePlus className="h-4 w-4 text-primary" />
              孩子自我评价
            </CardTitle>
            <CardDescription>让孩子用几句话记录状态、投入和下一步。</CardDescription>
          </div>
          <Badge variant="outline">{evaluations.length} 条</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form onSubmit={saveEvaluation} className="rounded-2xl border border-border bg-card p-4">
          <div className="grid gap-3">
            {editingEvaluationId && (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-primary/10 px-3 py-2 text-sm text-primary">
                正在编辑自评
                <button type="button" onClick={resetForm} className="inline-flex items-center gap-1 text-xs font-medium">
                  <X className="h-3.5 w-3.5" />
                  取消
                </button>
              </div>
            )}
            <div className="space-y-2">
              <Label>孩子</Label>
              <div className="grid grid-cols-3 gap-2">
                {childProfiles.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, childId: child.id }))}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-center text-sm font-medium transition",
                      form.childId === child.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
                    )}
                  >
                    {child.firstName}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="evaluation-subject">科目</Label>
              <Input
                id="evaluation-subject"
                placeholder="数学 / 阅读 / 综合"
                value={form.subject}
                className="h-11 rounded-xl"
                onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
              />
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {quickSubjects.map((subject) => (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, subject }))}
                    className={cn(
                      "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition",
                      form.subject === subject
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-card text-muted-foreground hover:bg-muted/60"
                    )}
                  >
                    {subject}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3">
              {[
                ["mood", "今天心情"],
                ["effort", "投入程度"],
                ["confidence", "掌握感觉"]
              ].map(([key, label]) => (
                <div key={key} className="space-y-1.5">
                  <Label>{label}</Label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {scoreOptions.map((option) => {
                      const active = form[key as "mood" | "effort" | "confidence"] === option.value;
                      return (
                        <button
                          key={`${key}-${option.value}`}
                          type="button"
                          onClick={() => setForm((current) => ({ ...current, [key]: option.value }))}
                          className={cn(
                            "rounded-lg border px-1.5 py-2 text-xs font-medium transition",
                            active ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground"
                          )}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="evaluation-reflection">今天我觉得</Label>
              <Textarea
                id="evaluation-reflection"
                placeholder="哪里做得不错？哪里有点卡？"
                value={form.reflection}
                className="min-h-24 rounded-xl"
                onChange={(event) => setForm((current) => ({ ...current, reflection: event.target.value }))}
              />
            </div>
            <button
              type="button"
              className="w-fit text-sm font-medium text-primary"
              onClick={() => setShowAdvanced((current) => !current)}
            >
              {showAdvanced ? "收起更多设置" : "更多设置：日期、下一步"}
            </button>
            {showAdvanced && (
              <div className="grid gap-3 rounded-2xl border border-border bg-muted/60 p-3">
                <div className="space-y-1.5">
                  <Label htmlFor="evaluation-date">日期</Label>
                  <Input
                    id="evaluation-date"
                    type="date"
                    value={form.evaluationDate}
                    className="h-11 rounded-xl bg-card"
                    onChange={(event) => setForm((current) => ({ ...current, evaluationDate: event.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="evaluation-next">下一步</Label>
                  <Input
                    id="evaluation-next"
                    placeholder="例如：明天再练 3 道应用题"
                    value={form.nextStep}
                    className="h-11 rounded-xl bg-card"
                    onChange={(event) => setForm((current) => ({ ...current, nextStep: event.target.value }))}
                  />
                </div>
              </div>
            )}
            <Button type="submit" className="h-11 rounded-xl" disabled={!form.childId || !form.subject.trim() || !form.reflection.trim()}>
              {editingEvaluationId ? "保存自评修改" : "保存自评"}
            </Button>
            {syncStatus && <p className="text-xs text-muted-foreground">{syncStatus}</p>}
          </div>
        </form>

        <div className="grid gap-3">
          {evaluations.map((evaluation) => (
            <div key={evaluation.id} className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card p-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{childById.get(evaluation.childId)}</Badge>
                  <p className="text-sm font-semibold">{evaluation.subject}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {evaluation.evaluationDate} · 心情 {evaluation.mood}/5 · 投入 {evaluation.effort}/5 · 掌握 {evaluation.confidence}/5
                </p>
                <p className="mt-2 text-sm leading-6 text-foreground">{evaluation.reflection}</p>
                {evaluation.nextStep && <p className="mt-1 text-xs text-muted-foreground">下一步：{evaluation.nextStep}</p>}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button type="button" variant="ghost" size="icon" onClick={() => editEvaluation(evaluation)} aria-label="编辑自评">
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => deleteEvaluation(evaluation.id)} aria-label="删除自评">
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}
          {evaluations.length === 0 && <p className="rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">还没有自评记录。</p>}
        </div>
      </CardContent>
    </Card>
  );
}
