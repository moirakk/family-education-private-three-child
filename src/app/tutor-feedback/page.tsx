"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, MessageSquareText, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getChildTheme } from "@/lib/child-theme";
import { getPrivateApi, postPrivateApi } from "@/lib/private-api-client";
import type { TutorFeedback } from "@/lib/types";
import { cn } from "@/lib/utils";

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

function createInitialForm(childId = "", tutorName = ""): TutorFeedbackFormState {
  return {
    childId,
    tutorName,
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
  const [showAdvanced, setShowAdvanced] = useState(false);

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
      setForm(createInitialForm(form.childId, form.tutorName.trim()));
      setShowAdvanced(false);
    } catch (error) {
      setStatus(error instanceof Error ? `提交失败：${error.message}` : "提交失败，请稍后重试。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-3 py-4 sm:px-4 sm:py-6">
      <div className="mx-auto grid max-w-2xl gap-4">
        <Card className="overflow-hidden border-border bg-card shadow-sm shadow-black/[0.03]">
          <CardHeader className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <MessageSquareText className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="w-fit gap-1 rounded-full bg-card">
                <ShieldCheck className="h-3.5 w-3.5" />
                仅反馈入口
              </Badge>
            </div>
            <div>
              <CardTitle className="text-2xl tracking-tight">家教课后反馈</CardTitle>
              <CardDescription className="mt-2 leading-6">
                只填写本次课后反馈，不开放完整家庭工作台。必填项控制在 4 个以内。
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveFeedback} className="grid gap-5">
              <section className="rounded-2xl bg-muted/50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">1. 基本信息</p>
                <div className="mt-3 grid gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label>孩子</Label>
                      <span className="text-xs text-muted-foreground">必选</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {children.map((child) => {
                        const theme = getChildTheme(child);
                        const active = form.childId === child.id;
                        return (
                          <button
                            key={child.id}
                            type="button"
                            onClick={() => setForm((current) => ({ ...current, childId: child.id }))}
                            className={cn(
                              "rounded-2xl border bg-card px-2 py-3 text-center text-sm font-semibold transition",
                              active ? "text-foreground shadow-sm" : "border-border text-muted-foreground"
                            )}
                            style={active ? { borderColor: theme.hex, ...theme.surfaceStyle } : undefined}
                          >
                            <span className="mx-auto mb-1 block h-2 w-2 rounded-full" style={theme.dotStyle} />
                            {child.firstName}
                            <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">{child.grade}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="tutor-name">老师姓名</Label>
                      <Input
                        id="tutor-name"
                        placeholder="例如：王老师"
                        value={form.tutorName}
                        className="h-11 rounded-xl bg-card"
                        onChange={(event) => setForm((current) => ({ ...current, tutorName: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="subject">科目</Label>
                      <Input
                        id="subject"
                        placeholder="数学 / 英语"
                        value={form.subject}
                        className="h-11 rounded-xl bg-card"
                        onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {quickSubjects.map((subject) => (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, subject }))}
                        className={cn(
                          "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                          form.subject === subject ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground"
                        )}
                      >
                        {subject}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="grid gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="focus">2. 本次重点</Label>
                  <Textarea
                    id="focus"
                    placeholder="本节课讲了什么、解决了什么问题"
                    value={form.focus}
                    className="min-h-28 rounded-2xl"
                    onChange={(event) => setForm((current) => ({ ...current, focus: event.target.value }))}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="performance">3. 孩子表现</Label>
                    <Textarea
                      id="performance"
                      placeholder="理解情况、注意力、薄弱点"
                      value={form.performance}
                      className="min-h-24 rounded-2xl"
                      onChange={(event) => setForm((current) => ({ ...current, performance: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="homework">课后任务</Label>
                    <Textarea
                      id="homework"
                      placeholder="作业 / 复习任务"
                      value={form.homework}
                      className="min-h-24 rounded-2xl"
                      onChange={(event) => setForm((current) => ({ ...current, homework: event.target.value }))}
                    />
                  </div>
                </div>
              </section>

              <button
                type="button"
                className="flex w-full items-center justify-between rounded-2xl border border-border bg-muted/40 px-3 py-2 text-left text-sm font-medium text-foreground"
                onClick={() => setShowAdvanced((current) => !current)}
              >
                更多设置：日期、时长、效果、下次方向
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition", showAdvanced && "rotate-180")} />
              </button>

              {showAdvanced && (
                <section className="grid gap-3 rounded-2xl border border-border bg-muted/50 p-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="session-date">上课日期</Label>
                      <Input
                        id="session-date"
                        type="date"
                        value={form.sessionDate}
                        className="h-11 rounded-xl bg-card"
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
                        className="h-11 rounded-xl bg-card"
                        onChange={(event) => setForm((current) => ({ ...current, durationMinutes: event.target.value }))}
                      />
                    </div>
                  </div>
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
                  <div className="space-y-1.5">
                    <Label htmlFor="next-focus">下次方向</Label>
                    <Input
                      id="next-focus"
                      placeholder="下次优先处理什么"
                      value={form.nextFocus}
                      className="h-11 rounded-xl bg-card"
                      onChange={(event) => setForm((current) => ({ ...current, nextFocus: event.target.value }))}
                    />
                  </div>
                </section>
              )}

              <Button
                type="submit"
                className="h-12 rounded-2xl"
                disabled={isSaving || !form.childId || !form.tutorName.trim() || !form.subject.trim() || !form.focus.trim()}
              >
                {isSaving ? "提交中..." : "提交课后反馈"}
              </Button>

              {status && (
                <p className="flex items-start gap-2 rounded-2xl bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  {status.startsWith("已提交") && <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />}
                  <span>{status}</span>
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
