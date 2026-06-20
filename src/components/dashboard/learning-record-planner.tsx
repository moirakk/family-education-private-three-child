"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BookOpenCheck, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isPrivateApiMode, postPrivateApi, deletePrivateApi } from "@/lib/private-api-client";
import type { Child, LearningRecord } from "@/lib/types";

type RecordFormState = {
  childId: string;
  subject: string;
  title: string;
  date: string;
  durationMinutes: string;
  score: string;
  confidence: string;
};

const storageKey = "family-education-private-learning-records-v1";

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function createInitialForm(childProfiles: Child[]): RecordFormState {
  return {
    childId: childProfiles[0]?.id ?? "",
    subject: "",
    title: "",
    date: todayDate(),
    durationMinutes: "30",
    score: "",
    confidence: "3"
  };
}

export function LearningRecordPlanner({
  childProfiles,
  onRecordsChange
}: {
  childProfiles: Child[];
  onRecordsChange: (records: LearningRecord[]) => void;
}) {
  const [records, setRecords] = useState<LearningRecord[]>([]);
  const [form, setForm] = useState<RecordFormState>(() => createInitialForm(childProfiles));
  const [syncStatus, setSyncStatus] = useState("");

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as LearningRecord[];
      setRecords(parsed);
      onRecordsChange(parsed);
    } catch {
      setRecords([]);
      onRecordsChange([]);
    }
  }, [onRecordsChange]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(records));
    onRecordsChange(records);
  }, [records, onRecordsChange]);

  const childById = useMemo(() => new Map(childProfiles.map((child) => [child.id, child.firstName])), [childProfiles]);

  async function addRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.childId || !form.subject.trim() || !form.title.trim()) return;

    const nextRecord: LearningRecord = {
      id: `local-record-${Date.now()}`,
      childId: form.childId,
      subject: form.subject.trim(),
      title: form.title.trim(),
      date: form.date || todayDate(),
      durationMinutes: Number(form.durationMinutes) || 0,
      score: form.score ? Number(form.score) : undefined,
      confidence: Math.min(5, Math.max(1, Number(form.confidence) || 3))
    };

    setRecords((current) => [nextRecord, ...current]);
    setForm(createInitialForm(childProfiles));

    if (!isPrivateApiMode()) return;

    try {
      setSyncStatus("正在同步到数据库...");
      const data = await postPrivateApi<{
        id: string;
        child_id: string;
        subject: string;
        title: string;
        record_date: string;
        duration_minutes: number | null;
        score: number | null;
        confidence: number | null;
      }>("/api/private/learning-records", nextRecord);

      setRecords((current) =>
        current.map((record) =>
          record.id === nextRecord.id
            ? {
                id: data.id,
                childId: data.child_id,
                subject: data.subject,
                title: data.title,
                date: data.record_date,
                durationMinutes: data.duration_minutes ?? 0,
                score: data.score ?? undefined,
                confidence: data.confidence ?? 3
              }
            : record
        )
      );
      setSyncStatus("已同步到数据库。");
    } catch (error) {
      setSyncStatus(error instanceof Error ? `本机已保存，数据库同步失败：${error.message}` : "本机已保存，数据库同步失败。");
    }
  }

  async function deleteRecord(recordId: string) {
    setRecords((current) => current.filter((record) => record.id !== recordId));
    if (isPrivateApiMode() && !recordId.startsWith("local-")) {
      await deletePrivateApi(`/api/private/learning-records?recordId=${encodeURIComponent(recordId)}`);
    }
  }

  return (
    <Card id="learning-records" className="border-white/70 bg-white/85 shadow-sm backdrop-blur">
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpenCheck className="h-4 w-4 text-primary" />
              学习记录编辑器
            </CardTitle>
            <CardDescription>
              现场记录学习内容、时长、分数和信心值，立刻进入成长摘要和周报。
            </CardDescription>
          </div>
          <Badge variant="outline">{records.length} 条本机新增记录</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <form onSubmit={addRecord} className="rounded-lg border bg-white p-4">
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
                <Label htmlFor="record-date">日期</Label>
                <Input
                  id="record-date"
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="record-subject">科目 / 领域</Label>
              <Input
                id="record-subject"
                placeholder="数学 / 阅读 / 拼读 / 英语"
                value={form.subject}
                onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="record-title">学习内容</Label>
              <Input
                id="record-title"
                placeholder="例如：小升初分数应用题复盘"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="record-duration">分钟</Label>
                <Input
                  id="record-duration"
                  type="number"
                  min="0"
                  value={form.durationMinutes}
                  onChange={(event) => setForm((current) => ({ ...current, durationMinutes: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="record-score">分数</Label>
                <Input
                  id="record-score"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="可选"
                  value={form.score}
                  onChange={(event) => setForm((current) => ({ ...current, score: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="record-confidence">信心 1-5</Label>
                <Input
                  id="record-confidence"
                  type="number"
                  min="1"
                  max="5"
                  value={form.confidence}
                  onChange={(event) => setForm((current) => ({ ...current, confidence: event.target.value }))}
                />
              </div>
            </div>
            <Button type="submit" disabled={!form.childId || !form.subject.trim() || !form.title.trim()}>
              新增学习记录
            </Button>
            {syncStatus && <p className="text-xs text-muted-foreground">{syncStatus}</p>}
          </div>
        </form>

        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm font-semibold">本机新增学习记录</p>
          <div className="mt-4 grid gap-3">
            {records.map((record) => (
              <div key={record.id} className="flex items-start justify-between gap-3 rounded-md bg-slate-50 p-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{childById.get(record.childId)}</Badge>
                    <p className="text-sm font-semibold">{record.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {record.subject} · {record.durationMinutes} 分钟 · 信心 {record.confidence}/5
                    {record.score !== undefined ? ` · ${record.score} 分` : ""}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => deleteRecord(record.id)} aria-label="删除学习记录">
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
            {records.length === 0 && (
              <p className="rounded-md bg-slate-50 p-4 text-sm text-muted-foreground">
                还没有本机新增学习记录。今天可以先记录 1-2 条真实学习事项，让家长看到成长追踪如何长期积累。
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
