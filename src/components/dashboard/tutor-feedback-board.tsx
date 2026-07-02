"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { MessageSquareText, Pencil, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { deletePrivateApi, getPrivateApi, isPrivateApiMode, postPrivateApi, putPrivateApi } from "@/lib/private-api-client";
import type { Child, TutorFeedback } from "@/lib/types";
import { cn } from "@/lib/utils";

type TutorFeedbackFormState = {
  childId: string;
  tutorName: string;
  subject: string;
  sessionDate: string;
  durationMinutes: string;
  focus: string;
  performance: string;
  homework: string;
  nextFocus: string;
  rating: string;
};

const storageKey = "family-education-private-tutor-feedback-v1";
const quickSubjects = ["数学", "英语", "语文", "阅读", "综合"];
const quickDurations = ["45", "60", "90", "120"];
const ratingOptions = [
  { value: "2", label: "需跟进" },
  { value: "3", label: "正常" },
  { value: "4", label: "不错" },
  { value: "5", label: "很好" }
];

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function clampRating(value: string) {
  return Math.min(5, Math.max(1, Number(value) || 3));
}

function createInitialForm(childProfiles: Child[]): TutorFeedbackFormState {
  return {
    childId: childProfiles[0]?.id ?? "",
    tutorName: "",
    subject: "",
    sessionDate: todayDate(),
    durationMinutes: "60",
    focus: "",
    performance: "",
    homework: "",
    nextFocus: "",
    rating: "3"
  };
}

export function TutorFeedbackBoard({ childProfiles }: { childProfiles: Child[] }) {
  const [feedbackItems, setFeedbackItems] = useState<TutorFeedback[]>([]);
  const [form, setForm] = useState<TutorFeedbackFormState>(() => createInitialForm(childProfiles));
  const [syncStatus, setSyncStatus] = useState("");
  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;

    try {
      setFeedbackItems(JSON.parse(raw) as TutorFeedback[]);
    } catch {
      setFeedbackItems([]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(feedbackItems));
  }, [feedbackItems]);

  useEffect(() => {
    if (!isPrivateApiMode()) return;

    getPrivateApi<TutorFeedback[]>("/api/private/tutor-feedback")
      .then((remoteFeedback) => {
        setFeedbackItems((current) => {
          const localOnly = current.filter((feedback) => feedback.id.startsWith("local-"));
          return [...remoteFeedback, ...localOnly];
        });
      })
      .catch((error) => {
        setSyncStatus(error instanceof Error ? `家教反馈读取数据库失败：${error.message}` : "家教反馈读取数据库失败。");
      });
  }, []);

  const childById = useMemo(() => new Map(childProfiles.map((child) => [child.id, child.firstName])), [childProfiles]);

  function resetForm() {
    setForm(createInitialForm(childProfiles));
    setEditingFeedbackId(null);
    setShowAdvanced(false);
  }

  function editFeedback(feedback: TutorFeedback) {
    setEditingFeedbackId(feedback.id);
    setForm({
      childId: feedback.childId,
      tutorName: feedback.tutorName,
      subject: feedback.subject,
      sessionDate: feedback.sessionDate,
      durationMinutes: String(feedback.durationMinutes),
      focus: feedback.focus,
      performance: feedback.performance,
      homework: feedback.homework,
      nextFocus: feedback.nextFocus,
      rating: String(feedback.rating)
    });
    setSyncStatus("");
    setShowAdvanced(true);
  }

  async function saveFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.childId || !form.tutorName.trim() || !form.subject.trim() || !form.focus.trim()) return;

    const nextFeedback: TutorFeedback = {
      id: `local-tutor-feedback-${Date.now()}`,
      childId: form.childId,
      tutorName: form.tutorName.trim(),
      subject: form.subject.trim(),
      sessionDate: form.sessionDate || todayDate(),
      durationMinutes: Number(form.durationMinutes) || 0,
      focus: form.focus.trim(),
      performance: form.performance.trim(),
      homework: form.homework.trim(),
      nextFocus: form.nextFocus.trim(),
      rating: clampRating(form.rating),
      createdAt: new Date().toISOString()
    };

    if (editingFeedbackId) {
      const previousFeedback = feedbackItems;
      const updatedFeedback = {
        ...nextFeedback,
        id: editingFeedbackId,
        createdAt: feedbackItems.find((feedback) => feedback.id === editingFeedbackId)?.createdAt ?? nextFeedback.createdAt
      };
      setFeedbackItems((current) => current.map((feedback) => (feedback.id === editingFeedbackId ? updatedFeedback : feedback)));
      resetForm();

      if (isPrivateApiMode() && !editingFeedbackId.startsWith("local-")) {
        try {
          setSyncStatus("正在同步家教反馈修改...");
          const data = await putPrivateApi<TutorFeedback>(
            `/api/private/tutor-feedback?feedbackId=${encodeURIComponent(editingFeedbackId)}`,
            updatedFeedback
          );
          setFeedbackItems((current) => current.map((feedback) => (feedback.id === editingFeedbackId ? data : feedback)));
          setSyncStatus("家教反馈修改已同步到数据库。");
        } catch (error) {
          setFeedbackItems(previousFeedback);
          setSyncStatus(error instanceof Error ? `修改失败，已恢复：${error.message}` : "修改失败，已恢复。");
        }
      }
      return;
    }

    setFeedbackItems((current) => [nextFeedback, ...current]);
    resetForm();

    if (!isPrivateApiMode()) return;

    try {
      setSyncStatus("正在同步到数据库...");
      const data = await postPrivateApi<TutorFeedback>("/api/private/tutor-feedback", nextFeedback);

      setFeedbackItems((current) =>
        current.map((feedback) => (feedback.id === nextFeedback.id ? data : feedback))
      );
      setSyncStatus("已同步到数据库。");
    } catch (error) {
      setSyncStatus(error instanceof Error ? `本机已保存，数据库同步失败：${error.message}` : "本机已保存，数据库同步失败。");
    }
  }

  async function deleteFeedback(feedbackId: string) {
    setFeedbackItems((current) => current.filter((feedback) => feedback.id !== feedbackId));
    if (isPrivateApiMode() && !feedbackId.startsWith("local-")) {
      await deletePrivateApi(`/api/private/tutor-feedback?feedbackId=${encodeURIComponent(feedbackId)}`);
    }
  }

  return (
    <Card id="tutor-feedback" className="border-border bg-card shadow-none">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquareText className="h-4 w-4 text-primary" />
              家教课后反馈
            </CardTitle>
            <CardDescription>记录每次家教课重点、表现、作业和下次方向。</CardDescription>
          </div>
          <Badge variant="outline">{feedbackItems.length} 条</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form onSubmit={saveFeedback} className="rounded-2xl border border-border bg-card p-4">
          <div className="grid gap-3">
            {editingFeedbackId && (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-primary/10 px-3 py-2 text-sm text-primary">
                正在编辑家教反馈
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
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="tutor-name">老师</Label>
                <Input
                  id="tutor-name"
                  placeholder="老师姓名"
                  value={form.tutorName}
                  className="h-11 rounded-xl"
                  onChange={(event) => setForm((current) => ({ ...current, tutorName: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tutor-subject">科目</Label>
                <Input
                  id="tutor-subject"
                  placeholder="数学 / 英语"
                  value={form.subject}
                  className="h-11 rounded-xl"
                  onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                />
                <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-1">
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
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tutor-focus">本次重点</Label>
              <Textarea
                id="tutor-focus"
                placeholder="本节课讲了什么、解决了什么问题"
                value={form.focus}
                className="min-h-24 rounded-xl"
                onChange={(event) => setForm((current) => ({ ...current, focus: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>本次效果</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {ratingOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, rating: option.value }))}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-xs font-medium transition",
                      form.rating === option.value ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              className="w-fit text-sm font-medium text-primary"
              onClick={() => setShowAdvanced((current) => !current)}
            >
              {showAdvanced ? "收起更多设置" : "更多设置：日期、时长、表现、作业、下次方向"}
            </button>
            {showAdvanced && (
              <div className="grid gap-3 rounded-2xl border border-border bg-muted/60 p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="tutor-date">日期</Label>
                    <Input
                      id="tutor-date"
                      type="date"
                      value={form.sessionDate}
                      className="h-11 rounded-xl bg-card"
                      onChange={(event) => setForm((current) => ({ ...current, sessionDate: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tutor-duration">分钟</Label>
                    <Input
                      id="tutor-duration"
                      type="number"
                      min="0"
                      value={form.durationMinutes}
                      className="h-11 rounded-xl bg-card"
                      onChange={(event) => setForm((current) => ({ ...current, durationMinutes: event.target.value }))}
                    />
                    <div className="grid grid-cols-4 gap-1.5">
                      {quickDurations.map((duration) => (
                        <button
                          key={duration}
                          type="button"
                          onClick={() => setForm((current) => ({ ...current, durationMinutes: duration }))}
                          className={cn(
                            "rounded-lg border px-2 py-1.5 text-xs font-medium",
                            form.durationMinutes === duration ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground"
                          )}
                        >
                          {duration}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tutor-performance">孩子表现</Label>
                  <Textarea
                    id="tutor-performance"
                    placeholder="理解情况、注意力、薄弱点"
                    value={form.performance}
                    className="rounded-xl bg-card"
                    onChange={(event) => setForm((current) => ({ ...current, performance: event.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tutor-homework">课后任务</Label>
                  <Input
                    id="tutor-homework"
                    placeholder="作业 / 复习任务"
                    value={form.homework}
                    className="h-11 rounded-xl bg-card"
                    onChange={(event) => setForm((current) => ({ ...current, homework: event.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tutor-next">下次方向</Label>
                  <Input
                    id="tutor-next"
                    placeholder="下次优先处理什么"
                    value={form.nextFocus}
                    className="h-11 rounded-xl bg-card"
                    onChange={(event) => setForm((current) => ({ ...current, nextFocus: event.target.value }))}
                  />
                </div>
              </div>
            )}
            <Button type="submit" className="h-11 rounded-xl" disabled={!form.childId || !form.tutorName.trim() || !form.subject.trim() || !form.focus.trim()}>
              {editingFeedbackId ? "保存反馈修改" : "保存反馈"}
            </Button>
            {syncStatus && <p className="text-xs text-muted-foreground">{syncStatus}</p>}
          </div>
        </form>

        <div className="grid gap-3">
          {feedbackItems.map((feedback) => (
            <div key={feedback.id} className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card p-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{childById.get(feedback.childId)}</Badge>
                  <p className="text-sm font-semibold">
                    {feedback.subject} · {feedback.tutorName}
                  </p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {feedback.sessionDate} · {feedback.durationMinutes} 分钟 · 效果 {feedback.rating}/5
                </p>
                <p className="mt-2 text-sm leading-6 text-foreground">{feedback.focus}</p>
                {feedback.performance && <p className="mt-1 text-xs text-muted-foreground">表现：{feedback.performance}</p>}
                {feedback.homework && <p className="mt-1 text-xs text-muted-foreground">任务：{feedback.homework}</p>}
                {feedback.nextFocus && <p className="mt-1 text-xs text-muted-foreground">下次：{feedback.nextFocus}</p>}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button type="button" variant="ghost" size="icon" onClick={() => editFeedback(feedback)} aria-label="编辑家教反馈">
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => deleteFeedback(feedback.id)} aria-label="删除家教反馈">
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}
          {feedbackItems.length === 0 && <p className="rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">还没有家教反馈。</p>}
        </div>
      </CardContent>
    </Card>
  );
}
