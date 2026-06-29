"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BookOpenCheck, Pencil, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deletePrivateApi, isPrivateApiMode, postPrivateApi, putPrivateApi } from "@/lib/private-api-client";
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
const quickSubjects = ["数学", "英语", "阅读", "语文", "科学", "综合"];
const quickDurations = ["20", "30", "45", "60"];
const confidenceOptions = [
  { value: "2", label: "有点卡" },
  { value: "3", label: "正常" },
  { value: "4", label: "不错" },
  { value: "5", label: "很稳" }
];

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
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

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

  function mapApiRecord(data: {
    id: string;
    child_id: string;
    subject: string;
    title: string;
    record_date: string;
    duration_minutes: number | null;
    score: number | null;
    confidence: number | null;
  }): LearningRecord {
    return {
      id: data.id,
      childId: data.child_id,
      subject: data.subject,
      title: data.title,
      date: data.record_date,
      durationMinutes: data.duration_minutes ?? 0,
      score: data.score ?? undefined,
      confidence: data.confidence ?? 3
    };
  }

  function resetForm() {
    setForm(createInitialForm(childProfiles));
    setEditingRecordId(null);
  }

  function editRecord(record: LearningRecord) {
    setEditingRecordId(record.id);
    setForm({
      childId: record.childId,
      subject: record.subject,
      title: record.title,
      date: record.date,
      durationMinutes: String(record.durationMinutes),
      score: record.score === undefined ? "" : String(record.score),
      confidence: String(record.confidence)
    });
    setSyncStatus("");
  }

  async function saveRecord(event: FormEvent<HTMLFormElement>) {
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

    if (editingRecordId) {
      const previousRecords = records;
      const updatedRecord = { ...nextRecord, id: editingRecordId };
      setRecords((current) => current.map((record) => (record.id === editingRecordId ? updatedRecord : record)));
      resetForm();

      if (isPrivateApiMode() && !editingRecordId.startsWith("local-")) {
        try {
          setSyncStatus("正在同步学习记录修改...");
          const data = await putPrivateApi<Parameters<typeof mapApiRecord>[0]>(
            `/api/private/learning-records?recordId=${encodeURIComponent(editingRecordId)}`,
            updatedRecord
          );
          setRecords((current) => current.map((record) => (record.id === editingRecordId ? mapApiRecord(data) : record)));
          setSyncStatus("学习记录修改已同步到数据库。");
        } catch (error) {
          setRecords(previousRecords);
          setSyncStatus(error instanceof Error ? `修改失败，已恢复：${error.message}` : "修改失败，已恢复。");
        }
      }
      return;
    }

    setRecords((current) => [nextRecord, ...current]);
    resetForm();

    if (!isPrivateApiMode()) return;

    try {
      setSyncStatus("正在同步到数据库...");
      const data = await postPrivateApi<Parameters<typeof mapApiRecord>[0]>("/api/private/learning-records", nextRecord);

      setRecords((current) =>
        current.map((record) => (record.id === nextRecord.id ? mapApiRecord(data) : record))
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
              记录学习
            </CardTitle>
            <CardDescription>
              手机上快速记一条学习内容，后续沉淀到成长摘要和周报。
            </CardDescription>
          </div>
          <Badge variant="outline">{records.length} 条本机新增记录</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <form onSubmit={saveRecord} className="rounded-lg border bg-white p-4">
          <div className="grid gap-3">
            {editingRecordId && (
              <div className="flex items-center justify-between gap-3 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">
                正在编辑学习记录
                <button type="button" onClick={resetForm} className="inline-flex items-center gap-1 text-xs font-medium">
                  <X className="h-3.5 w-3.5" />
                  取消
                </button>
              </div>
            )}
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
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {quickSubjects.map((subject) => (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, subject }))}
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                      form.subject === subject
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50"
                    }`}
                  >
                    {subject}
                  </button>
                ))}
              </div>
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
                <div className="grid grid-cols-4 gap-1">
                  {quickDurations.map((duration) => (
                    <button
                      key={duration}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, durationMinutes: duration }))}
                      className={`rounded-md border px-2 py-1 text-xs font-medium ${
                        form.durationMinutes === duration
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      {duration}
                    </button>
                  ))}
                </div>
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
                  className="sm:hidden"
                  type="number"
                  min="1"
                  max="5"
                  value={form.confidence}
                  onChange={(event) => setForm((current) => ({ ...current, confidence: event.target.value }))}
                />
                <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
                  {confidenceOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, confidence: option.value }))}
                      className={`rounded-md border px-2 py-1.5 text-xs font-medium ${
                        form.confidence === option.value
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <Button type="submit" disabled={!form.childId || !form.subject.trim() || !form.title.trim()}>
              {editingRecordId ? "保存学习记录修改" : "新增学习记录"}
            </Button>
            {syncStatus && <p className="text-xs text-muted-foreground">{syncStatus}</p>}
          </div>
        </form>

        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm font-semibold">最近记录</p>
          <div className="mt-4 grid gap-3">
            {records.map((record) => (
              <div key={record.id} className="flex items-start justify-between gap-3 rounded-md border border-slate-100 bg-slate-50 p-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{childById.get(record.childId)}</Badge>
                    <Badge variant="secondary">{record.date}</Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5">{record.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {record.subject} · {record.durationMinutes} 分钟 · 信心 {record.confidence}/5
                    {record.score !== undefined ? ` · ${record.score} 分` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                  <Button type="button" variant="ghost" size="icon" onClick={() => editRecord(record)} aria-label="编辑学习记录">
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => deleteRecord(record.id)} aria-label="删除学习记录">
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
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
