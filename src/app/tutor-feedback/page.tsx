"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, MessageSquareText, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getPrivateApi, postPrivateApi } from "@/lib/private-api-client";
import type { TutorFeedback } from "@/lib/types";

type TutorChild = {
  id: string;
  firstName: string;
  grade: string;
  avatarColor: string;
};

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

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function createInitialForm(childId = ""): TutorFeedbackFormState {
  return {
    childId,
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

function clampRating(value: string) {
  return Math.min(5, Math.max(1, Number(value) || 3));
}

export default function TutorFeedbackPage() {
  const [children, setChildren] = useState<TutorChild[]>([]);
  const [form, setForm] = useState<TutorFeedbackFormState>(() => createInitialForm());
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getPrivateApi<{ children: TutorChild[] }>("/api/private/tutor-context")
      .then((data) => {
        setChildren(data.children);
        setForm((current) => ({
          ...current,
          childId: current.childId || data.children[0]?.id || ""
        }));
      })
      .catch((error) => {
        setStatus(error instanceof Error ? `读取孩子列表失败：${error.message}` : "读取孩子列表失败。");
      });
  }, []);

  async function saveFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.childId || !form.tutorName.trim() || !form.subject.trim() || !form.focus.trim()) return;

    try {
      setIsSaving(true);
      setStatus("正在提交课后反馈...");
      await postPrivateApi<TutorFeedback>("/api/private/tutor-feedback", {
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
      });

      setStatus("已提交。家长会在家庭教育系统里看到这条反馈。");
      setForm(createInitialForm(form.childId));
    } catch (error) {
      setStatus(error instanceof Error ? `提交失败：${error.message}` : "提交失败，请稍后重试。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto grid max-w-2xl gap-4">
        <Card className="border-white/70 bg-white/90 shadow-sm backdrop-blur">
          <CardHeader>
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <MessageSquareText className="h-5 w-5" />
            </div>
            <CardTitle>家教课后反馈</CardTitle>
            <CardDescription>这个入口只用于提交本次课后反馈，不开放完整家庭工作台。</CardDescription>
            <Badge variant="outline" className="w-fit gap-1">
              <ShieldCheck className="h-3 w-3" />
              Tutor limited access
            </Badge>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveFeedback} className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>孩子</Label>
                  <Select value={form.childId} onValueChange={(value) => setForm((current) => ({ ...current, childId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择孩子" />
                    </SelectTrigger>
                    <SelectContent>
                      {children.map((child) => (
                        <SelectItem key={child.id} value={child.id}>
                          {child.firstName} · {child.grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tutor-name">老师姓名</Label>
                  <Input
                    id="tutor-name"
                    value={form.tutorName}
                    onChange={(event) => setForm((current) => ({ ...current, tutorName: event.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="subject">科目</Label>
                  <Input
                    id="subject"
                    placeholder="数学 / 英语"
                    value={form.subject}
                    onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="session-date">上课日期</Label>
                  <Input
                    id="session-date"
                    type="date"
                    value={form.sessionDate}
                    onChange={(event) => setForm((current) => ({ ...current, sessionDate: event.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="duration">分钟</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="0"
                    value={form.durationMinutes}
                    onChange={(event) => setForm((current) => ({ ...current, durationMinutes: event.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="focus">本次重点</Label>
                <Textarea
                  id="focus"
                  placeholder="本节课讲了什么、解决了什么问题"
                  value={form.focus}
                  onChange={(event) => setForm((current) => ({ ...current, focus: event.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="performance">孩子表现</Label>
                <Textarea
                  id="performance"
                  placeholder="理解情况、注意力、薄弱点"
                  value={form.performance}
                  onChange={(event) => setForm((current) => ({ ...current, performance: event.target.value }))}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                <div className="space-y-1.5">
                  <Label htmlFor="homework">课后任务</Label>
                  <Input
                    id="homework"
                    placeholder="作业 / 复习任务"
                    value={form.homework}
                    onChange={(event) => setForm((current) => ({ ...current, homework: event.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rating">效果 1-5</Label>
                  <Input
                    id="rating"
                    type="number"
                    min="1"
                    max="5"
                    value={form.rating}
                    onChange={(event) => setForm((current) => ({ ...current, rating: event.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="next-focus">下次方向</Label>
                <Input
                  id="next-focus"
                  placeholder="下次优先处理什么"
                  value={form.nextFocus}
                  onChange={(event) => setForm((current) => ({ ...current, nextFocus: event.target.value }))}
                />
              </div>

              <Button type="submit" disabled={isSaving || !form.childId || !form.tutorName.trim() || !form.subject.trim() || !form.focus.trim()}>
                {isSaving ? "提交中..." : "提交课后反馈"}
              </Button>
              {status && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  {status.startsWith("已提交") && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                  {status}
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
