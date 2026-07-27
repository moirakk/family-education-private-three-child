"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, MessageSquareText, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getChildTheme } from "@/lib/child-theme";
import { getPrivateApi, postPrivateApi } from "@/lib/private-api-client";
import type { TutorFeedback } from "@/lib/types";

type TutorChild = {
  id: string;
  firstName: string;
  grade: string;
  avatarColor: string;
};

type TutorScope = {
  childId: string;
  tutorName: string;
  subject: string;
};

type TutorContext = {
  children: TutorChild[];
  tutorScope: TutorScope | null;
};

type TutorFeedbackFormState = {
  sessionDate: string;
  focus: string;
  performance: string;
  homework: string;
};

function todayDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function createInitialForm(): TutorFeedbackFormState {
  return { sessionDate: todayDate(), focus: "", performance: "", homework: "" };
}

export default function TutorFeedbackPage() {
  const [context, setContext] = useState<TutorContext | null>(null);
  const [form, setForm] = useState<TutorFeedbackFormState>(() => createInitialForm());
  const [status, setStatus] = useState("正在读取专属链接...");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getPrivateApi<TutorContext>("/api/private/tutor-context")
      .then((data) => {
        if (!data.tutorScope || data.children.length !== 1) {
          setStatus("请使用家长在系统中生成的专属家教链接进入。");
          return;
        }
        setContext(data);
        setStatus("");
      })
      .catch((error) => {
        console.error("Failed to load tutor context:", error);
        setStatus("链接验证失败，请联系家长重新生成专属链接。");
      });
  }, []);

  async function saveFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const child = context?.children[0];
    const tutorScope = context?.tutorScope;
    if (!child || !tutorScope || !form.sessionDate || !form.focus.trim() || !form.performance.trim() || !form.homework.trim()) return;

    try {
      setIsSaving(true);
      setStatus("正在提交课后反馈...");
      await postPrivateApi<TutorFeedback>("/api/private/tutor-feedback", {
        childId: child.id,
        tutorName: tutorScope.tutorName,
        subject: tutorScope.subject,
        sessionDate: form.sessionDate,
        durationMinutes: 0,
        focus: form.focus.trim(),
        performance: form.performance.trim(),
        homework: form.homework.trim(),
        nextFocus: "",
        rating: 3,
        createdAt: new Date().toISOString()
      });

      setStatus("已提交。家长会在家庭教育系统里看到这条反馈。");
      setForm(createInitialForm());
    } catch (error) {
      console.error("Failed to submit tutor feedback:", error);
      setStatus("提交失败，请稍后重试或联系家长获取新链接。");
    } finally {
      setIsSaving(false);
    }
  }

  const child = context?.children[0] ?? null;
  const tutorScope = context?.tutorScope ?? null;
  const theme = getChildTheme(child);
  const canSubmit = Boolean(
    child && tutorScope && form.sessionDate && form.focus.trim() && form.performance.trim() && form.homework.trim()
  );

  return (
    <main className="min-h-screen px-3 py-4 sm:px-4 sm:py-6">
      <div className="mx-auto grid max-w-xl gap-4">
        <Card className="overflow-hidden">
          <CardHeader className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm shadow-primary/20">
                <MessageSquareText className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="w-fit gap-1 rounded-full">
                <ShieldCheck className="h-3.5 w-3.5" />
                仅反馈入口
              </Badge>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight">家教课后反馈</CardTitle>
              <CardDescription className="mt-2 leading-6">填写本次课后的四项反馈，不开放完整家庭工作台。</CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            {child && tutorScope ? (
              <form onSubmit={saveFeedback} className="grid gap-5">
                <section className="rounded-2xl border-l-[3px] bg-secondary/60 p-4 dark:bg-white/[0.05]" style={theme.borderStyle}>
                  <p className="text-xs text-muted-foreground">本链接已绑定</p>
                  <p className="mt-1 text-base font-semibold text-foreground">
                    {child.firstName} · {tutorScope.subject}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{tutorScope.tutorName} · {child.grade}</p>
                </section>

                <div className="space-y-2">
                  <Label htmlFor="session-date">1. 上课日期 *</Label>
                  <Input
                    id="session-date"
                    type="date"
                    required
                    value={form.sessionDate}
                    className="h-12 rounded-xl bg-card text-base"
                    onChange={(event) => setForm((current) => ({ ...current, sessionDate: event.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="focus">2. 授课内容 *</Label>
                  <Textarea
                    id="focus"
                    required
                    maxLength={2000}
                    placeholder="今天讲了什么、解决了什么问题"
                    value={form.focus}
                    className="min-h-28 rounded-2xl text-base"
                    onChange={(event) => setForm((current) => ({ ...current, focus: event.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="performance">3. 孩子表现 *</Label>
                  <Textarea
                    id="performance"
                    required
                    maxLength={2000}
                    placeholder="理解情况、专注度、需要关注的地方"
                    value={form.performance}
                    className="min-h-24 rounded-2xl text-base"
                    onChange={(event) => setForm((current) => ({ ...current, performance: event.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="homework">4. 课后任务 *</Label>
                  <Textarea
                    id="homework"
                    required
                    maxLength={2000}
                    placeholder="作业、复习内容或下次课前准备"
                    value={form.homework}
                    className="min-h-24 rounded-2xl text-base"
                    onChange={(event) => setForm((current) => ({ ...current, homework: event.target.value }))}
                  />
                </div>

                <Button type="submit" className="h-12 rounded-2xl" disabled={isSaving || !canSubmit}>
                  {isSaving ? "提交中..." : "提交课后反馈"}
                </Button>
              </form>
            ) : (
              <p className="rounded-2xl bg-muted/60 p-4 text-sm leading-relaxed text-muted-foreground">{status}</p>
            )}

            {child && tutorScope && status && (
              <p className="mt-4 flex items-start gap-2 rounded-2xl bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                {status.startsWith("已提交") && <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />}
                <span>{status}</span>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
