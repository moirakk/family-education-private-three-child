"use client";

import { useMemo, useState } from "react";
import { MessageSquareText, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTutorFeedback } from "@/hooks/use-tutor-feedback";
import type { Child } from "@/lib/types";

export function TutorFeedbackBoard({ childProfiles }: { childProfiles: Child[] }) {
  const { feedbackItems, syncStatus, deleteFeedback } = useTutorFeedback();
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const childById = useMemo(() => new Map(childProfiles.map((child) => [child.id, child.firstName])), [childProfiles]);

  function confirmDelete(feedbackId: string) {
    setConfirmingDeleteId(null);
    void deleteFeedback(feedbackId);
  }

  return (
    <Card id="tutor-feedback">
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
            <div key={feedback.id} className="rounded-2xl border border-white/60 bg-white/60 p-3 shadow-sm shadow-black/[0.03] backdrop-blur-sm transition-shadow duration-300 hover:shadow-md hover:shadow-black/[0.06] dark:border-white/10 dark:bg-white/[0.05]">
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
                      <Button type="button" variant="destructive" size="sm" className="rounded-full px-3" onClick={() => confirmDelete(feedback.id)}>
                        确认删除
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="rounded-full px-3" onClick={() => setConfirmingDeleteId(null)}>
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
              <p className="mt-3 text-sm leading-relaxed text-foreground">{feedback.focus}</p>
              {feedback.performance && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">表现：{feedback.performance}</p>}
              {feedback.homework && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">任务：{feedback.homework}</p>}
            </div>
          ))}
          {feedbackItems.length === 0 && (
            <p className="rounded-xl border border-dashed border-border bg-muted/40 p-5 text-center text-sm leading-relaxed text-muted-foreground dark:border-white/15 dark:bg-white/[0.04]">
              还没有家教反馈。请在“设置 → 分享入口”生成专属链接发给老师，提交后会自动出现在这里。
            </p>
          )}
        </div>

        {syncStatus && <p className="text-xs text-muted-foreground">{syncStatus}</p>}
      </CardContent>
    </Card>
  );
}
