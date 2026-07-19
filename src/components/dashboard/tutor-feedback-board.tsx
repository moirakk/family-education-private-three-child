"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquareText, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { deletePrivateApi, getPrivateApi, isPrivateApiMode } from "@/lib/private-api-client";
import type { Child, TutorFeedback } from "@/lib/types";

const storageKey = "family-education-private-tutor-feedback-v1";

export function TutorFeedbackBoard({ childProfiles }: { childProfiles: Child[] }) {
  const [feedbackItems, setFeedbackItems] = useState<TutorFeedback[]>([]);
  const [syncStatus, setSyncStatus] = useState("");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

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

  async function deleteFeedback(feedbackId: string) {
    const previousFeedback = feedbackItems;
    setConfirmingDeleteId(null);
    setFeedbackItems((current) => current.filter((feedback) => feedback.id !== feedbackId));

    if (isPrivateApiMode() && !feedbackId.startsWith("local-")) {
      try {
        await deletePrivateApi(`/api/private/tutor-feedback?feedbackId=${encodeURIComponent(feedbackId)}`);
        setSyncStatus("家教反馈已删除。");
      } catch (error) {
        setFeedbackItems(previousFeedback);
        setSyncStatus(error instanceof Error ? `删除失败，已恢复：${error.message}` : "删除失败，已恢复。");
      }
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
            <CardDescription>家长侧只查看老师提交的反馈，填写入口通过专属链接分享给家教。</CardDescription>
          </div>
          <Badge variant="outline" className="w-fit rounded-full bg-card">{feedbackItems.length} 条</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3">
          {feedbackItems.map((feedback) => (
            <div key={feedback.id} className="rounded-2xl border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-full bg-card">{childById.get(feedback.childId) ?? "孩子"}</Badge>
                    <p className="min-w-0 text-sm font-semibold">
                      {feedback.subject} · {feedback.tutorName}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{feedback.sessionDate}</p>
                </div>
                {confirmingDeleteId === feedback.id ? (
                  <div className="flex shrink-0 flex-col items-end gap-2 rounded-2xl border border-destructive/20 bg-destructive/5 p-2 text-right sm:flex-row sm:items-center">
                    <span className="text-xs font-medium text-destructive">删除这条反馈？</span>
                    <div className="flex gap-1">
                      <Button type="button" variant="destructive" size="sm" className="h-8 rounded-full px-3" onClick={() => deleteFeedback(feedback.id)}>
                        确认删除
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="h-8 rounded-full px-3" onClick={() => setConfirmingDeleteId(null)}>
                        取消
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 rounded-full"
                    onClick={() => setConfirmingDeleteId(feedback.id)}
                    aria-label="删除家教反馈"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
              <p className="mt-3 text-sm leading-6 text-foreground">{feedback.focus}</p>
              {feedback.performance && <p className="mt-2 text-xs leading-5 text-muted-foreground">表现：{feedback.performance}</p>}
              {feedback.homework && <p className="mt-1 text-xs leading-5 text-muted-foreground">任务：{feedback.homework}</p>}
            </div>
          ))}
          {feedbackItems.length === 0 && (
            <p className="rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
              还没有家教反馈。请在“设置 → 分享入口”生成专属链接发给老师，提交后会自动出现在这里。
            </p>
          )}
        </div>

        {syncStatus && <p className="text-xs text-muted-foreground">{syncStatus}</p>}
      </CardContent>
    </Card>
  );
}
