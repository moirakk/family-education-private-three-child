"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { MessageSquareText, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { deletePrivateApi, isPrivateApiMode, postPrivateApi } from "@/lib/private-api-client";
import type { Child, TutorFeedback } from "@/lib/types";

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

  const childById = useMemo(() => new Map(childProfiles.map((child) => [child.id, child.firstName])), [childProfiles]);

  async function addFeedback(event: FormEvent<HTMLFormElement>) {
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

    setFeedbackItems((current) => [nextFeedback, ...current]);
    setForm(createInitialForm(childProfiles));

    if (!isPrivateApiMode()) return;

    try {
      setSyncStatus("正在同步到数据库...");
      const data = await postPrivateApi<{
        id: string;
        child_id: string;
        tutor_name: string;
        subject: string;
        session_date: string;
        duration_minutes: number | null;
        focus: string;
        performance: string | null;
        homework: string | null;
        next_focus: string | null;
        rating: number;
        created_at: string;
      }>("/api/private/tutor-feedback", nextFeedback);

      setFeedbackItems((current) =>
        current.map((feedback) =>
          feedback.id === nextFeedback.id
            ? {
                id: data.id,
                childId: data.child_id,
                tutorName: data.tutor_name,
                subject: data.subject,
                sessionDate: data.session_date,
                durationMinutes: data.duration_minutes ?? 0,
                focus: data.focus,
                performance: data.performance ?? "",
                homework: data.homework ?? "",
                nextFocus: data.next_focus ?? "",
                rating: data.rating,
                createdAt: data.created_at
              }
            : feedback
        )
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
    <Card id="tutor-feedback" className="border-white/70 bg-white/85 shadow-sm backdrop-blur">
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
        <form onSubmit={addFeedback} className="rounded-lg border bg-white p-4">
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>孩子</Label>
                <Select value={form.childId} onValueChange={(value) => setForm((current) => ({ ...current, childId: value }))}>
                  <SelectTrigger>
                    <SelectValue />
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
                <Label htmlFor="tutor-name">老师</Label>
                <Input
                  id="tutor-name"
                  placeholder="老师姓名"
                  value={form.tutorName}
                  onChange={(event) => setForm((current) => ({ ...current, tutorName: event.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="tutor-subject">科目</Label>
                <Input
                  id="tutor-subject"
                  placeholder="数学 / 英语"
                  value={form.subject}
                  onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tutor-date">日期</Label>
                <Input
                  id="tutor-date"
                  type="date"
                  value={form.sessionDate}
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
                  onChange={(event) => setForm((current) => ({ ...current, durationMinutes: event.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tutor-focus">本次重点</Label>
              <Textarea
                id="tutor-focus"
                placeholder="本节课讲了什么、解决了什么问题"
                value={form.focus}
                onChange={(event) => setForm((current) => ({ ...current, focus: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tutor-performance">孩子表现</Label>
              <Textarea
                id="tutor-performance"
                placeholder="理解情况、注意力、薄弱点"
                value={form.performance}
                onChange={(event) => setForm((current) => ({ ...current, performance: event.target.value }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
              <div className="space-y-1.5">
                <Label htmlFor="tutor-homework">课后任务</Label>
                <Input
                  id="tutor-homework"
                  placeholder="作业 / 复习任务"
                  value={form.homework}
                  onChange={(event) => setForm((current) => ({ ...current, homework: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tutor-rating">效果 1-5</Label>
                <Input
                  id="tutor-rating"
                  type="number"
                  min="1"
                  max="5"
                  value={form.rating}
                  onChange={(event) => setForm((current) => ({ ...current, rating: event.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tutor-next">下次方向</Label>
              <Input
                id="tutor-next"
                placeholder="下次优先处理什么"
                value={form.nextFocus}
                onChange={(event) => setForm((current) => ({ ...current, nextFocus: event.target.value }))}
              />
            </div>
            <Button type="submit" disabled={!form.childId || !form.tutorName.trim() || !form.subject.trim() || !form.focus.trim()}>
              保存反馈
            </Button>
            {syncStatus && <p className="text-xs text-muted-foreground">{syncStatus}</p>}
          </div>
        </form>

        <div className="grid gap-3">
          {feedbackItems.map((feedback) => (
            <div key={feedback.id} className="flex items-start justify-between gap-3 rounded-md border bg-white p-3">
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
                <p className="mt-2 text-sm leading-6 text-slate-700">{feedback.focus}</p>
                {feedback.performance && <p className="mt-1 text-xs text-muted-foreground">表现：{feedback.performance}</p>}
                {feedback.homework && <p className="mt-1 text-xs text-muted-foreground">任务：{feedback.homework}</p>}
                {feedback.nextFocus && <p className="mt-1 text-xs text-muted-foreground">下次：{feedback.nextFocus}</p>}
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => deleteFeedback(feedback.id)} aria-label="删除家教反馈">
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
          {feedbackItems.length === 0 && <p className="rounded-md bg-slate-50 p-4 text-sm text-muted-foreground">还没有家教反馈。</p>}
        </div>
      </CardContent>
    </Card>
  );
}
