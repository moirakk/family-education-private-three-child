"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Download, Pencil, Plus, Trash2, TrendingUp, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { todayIsoDate } from "@/lib/date-utils";
import { deletePrivateApi, isPrivateApiMode, postPrivateApi, putPrivateApi } from "@/lib/private-api-client";
import { getLocalOnlyItems } from "@/lib/reconciled-collection";
import type { Child, LearningRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

type ExamType = NonNullable<LearningRecord["examType"]>;
type FormState = {
  childId: string;
  subject: string;
  customSubject: string;
  title: string;
  date: string;
  score: string;
  maxScore: string;
  examType: ExamType;
  notes: string;
};

const storageKey = "family-education-private-learning-records-v1";
const subjects = ["语文", "数学", "英语", "其他"];
const examTypes: { value: ExamType; label: string }[] = [
  { value: "quiz", label: "日常测验" },
  { value: "monthly", label: "月考" },
  { value: "midterm", label: "期中" },
  { value: "final", label: "期末" },
  { value: "other", label: "其他" }
];

function initialForm(children: Child[]): FormState {
  return { childId: children[0]?.id ?? "", subject: "数学", customSubject: "", title: "", date: todayIsoDate(), score: "", maxScore: "100", examType: "quiz", notes: "" };
}

function percentage(record: LearningRecord) {
  const max = record.maxScore ?? 100;
  return record.score === undefined || max <= 0 ? null : Math.round((record.score / max) * 1000) / 10;
}

function download(fileName: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function LearningRecordPlanner({ childProfiles, existingRecords = [], onRecordsChange, openFormRequest = 0 }: {
  childProfiles: Child[];
  existingRecords?: LearningRecord[];
  onRecordsChange: (records: LearningRecord[]) => void;
  openFormRequest?: number;
}) {
  const [records, setRecords] = useState<LearningRecord[]>([]);
  const [form, setForm] = useState(() => initialForm(childProfiles));
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [childFilter, setChildFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const loadedExisting = useRef(false);

  useEffect(() => {
    if (!loadedExisting.current && existingRecords.length) {
      loadedExisting.current = true;
      setRecords(existingRecords);
    }
  }, [existingRecords]);

  useEffect(() => { if (openFormRequest > 0) setShowForm(true); }, [openFormRequest]);
  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as LearningRecord[];
      const local = isPrivateApiMode() ? getLocalOnlyItems(parsed) : parsed;
      setRecords(local);
      onRecordsChange(local);
    } catch { setRecords([]); }
  }, [onRecordsChange]);
  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(isPrivateApiMode() ? getLocalOnlyItems(records) : records));
    onRecordsChange(records);
  }, [onRecordsChange, records]);

  const childById = useMemo(() => new Map(childProfiles.map((child) => [child.id, child.firstName])), [childProfiles]);
  const visible = useMemo(() => records.filter((record) =>
    (childFilter === "all" || record.childId === childFilter) &&
    (subjectFilter === "all" || record.subject === subjectFilter) &&
    (typeFilter === "all" || (record.examType ?? "quiz") === typeFilter)
  ).sort((a, b) => b.date.localeCompare(a.date)), [childFilter, records, subjectFilter, typeFilter]);
  const scored = visible.map((record) => percentage(record)).filter((value): value is number => value !== null);
  const average = scored.length ? Math.round(scored.reduce((sum, value) => sum + value, 0) / scored.length * 10) / 10 : null;
  const highest = scored.length ? Math.max(...scored) : null;

  function reset() {
    setForm(initialForm(childProfiles));
    setEditingId(null);
    setShowForm(false);
  }

  function mapApi(data: {
    id: string; child_id: string; subject: string; title: string; record_date: string;
    duration_minutes: number | null; score: number | null; max_score: number | null;
    exam_type: ExamType | null; notes: string | null; confidence: number | null;
  }): LearningRecord {
    return { id: data.id, childId: data.child_id, subject: data.subject, title: data.title, date: data.record_date,
      durationMinutes: data.duration_minutes ?? 0, score: data.score ?? undefined, maxScore: data.max_score ?? undefined,
      examType: data.exam_type ?? "quiz", notes: data.notes ?? undefined, confidence: data.confidence ?? 3 };
  }

  function edit(record: LearningRecord) {
    const fixedSubject = subjects.includes(record.subject) ? record.subject : "其他";
    setForm({ childId: record.childId, subject: fixedSubject, customSubject: fixedSubject === "其他" ? record.subject : "", title: record.title,
      date: record.date, score: record.score === undefined ? "" : String(record.score), maxScore: String(record.maxScore ?? 100),
      examType: record.examType ?? "quiz", notes: record.notes ?? "" });
    setEditingId(record.id);
    setShowForm(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const subject = form.subject === "其他" ? form.customSubject.trim() : form.subject;
    const score = Number(form.score);
    const maxScore = Number(form.maxScore);
    if (!form.childId || !subject || !form.title.trim() || !form.date || !Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0 || score < 0 || score > maxScore) {
      setStatus("请检查孩子、科目、考试名称、日期和分数；得分不能超过满分。");
      return;
    }
    const next: LearningRecord = { id: editingId ?? `local-record-${Date.now()}`, childId: form.childId, subject, title: form.title.trim(), date: form.date,
      score, maxScore, examType: form.examType, notes: form.notes.trim() || undefined, durationMinutes: 0, confidence: 3 };
    const previous = records;
    setRecords((current) => editingId ? current.map((item) => item.id === editingId ? next : item) : [next, ...current]);
    reset();
    if (!isPrivateApiMode()) { setStatus("成绩已保存到当前设备。"); return; }
    try {
      setStatus("正在保存成绩...");
      const payload = editingId
        ? await putPrivateApi<Parameters<typeof mapApi>[0]>(`/api/private/learning-records?recordId=${encodeURIComponent(editingId)}`, next)
        : await postPrivateApi<Parameters<typeof mapApi>[0]>("/api/private/learning-records", next);
      const saved = mapApi(payload);
      setRecords((current) => current.map((item) => item.id === next.id ? saved : item));
      setStatus("成绩已保存。");
    } catch (error) {
      setRecords(previous);
      setStatus(error instanceof Error ? `保存失败，已恢复：${error.message}` : "保存失败，已恢复。" );
    }
  }

  async function remove(id: string) {
    const previous = records;
    setConfirmDeleteId(null);
    setRecords((current) => current.filter((item) => item.id !== id));
    if (!isPrivateApiMode() || id.startsWith("local-")) return;
    try { await deletePrivateApi(`/api/private/learning-records?recordId=${encodeURIComponent(id)}`); setStatus("成绩已删除。" ); }
    catch (error) { setRecords(previous); setStatus(error instanceof Error ? `删除失败：${error.message}` : "删除失败。" ); }
  }

  function exportExcel() {
    const rows = visible.map((record) => [record.date, childById.get(record.childId) ?? "", record.subject, record.title,
      examTypes.find((item) => item.value === (record.examType ?? "quiz"))?.label ?? "", record.score ?? "", record.maxScore ?? 100, percentage(record) ?? "", record.notes ?? ""]);
    const html = `<table><tr><th>日期</th><th>孩子</th><th>科目</th><th>考试</th><th>类型</th><th>得分</th><th>满分</th><th>百分比</th><th>备注</th></tr>${rows.map((row) => `<tr>${row.map((cell) => `<td>${String(cell).replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</td>`).join("")}</tr>`).join("")}</table>`;
    download("考试成绩.xls", `\ufeff${html}`, "application/vnd.ms-excel;charset=utf-8");
  }

  return (
    <Card id="learning-records" className="border-border bg-card shadow-none">
      <CardHeader className="gap-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>考试成绩</CardTitle>
          <Button type="button" onClick={() => setShowForm(true)}><Plus className="mr-2 h-4 w-4" />录入成绩</Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">最近</p><p className="mt-1 font-semibold">{scored[0] ?? "-"}%</p></div>
          <div className="rounded-xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">平均</p><p className="mt-1 font-semibold">{average ?? "-"}%</p></div>
          <div className="rounded-xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">最高</p><p className="mt-1 font-semibold">{highest ?? "-"}%</p></div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[{ id: "all", firstName: "全部" }, ...childProfiles].map((child) => <button key={child.id} type="button" onClick={() => setChildFilter(child.id)} className={cn("min-h-11 shrink-0 rounded-full border px-4 py-1.5 text-xs sm:min-h-9 sm:px-3", childFilter === child.id ? "border-foreground bg-foreground text-background" : "border-border")}>{child.firstName}</button>)}
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <select className="h-11 rounded-xl border border-border bg-card px-3 text-base sm:h-10 sm:text-sm" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}><option value="all">全部科目</option>{subjects.map((item) => <option key={item}>{item}</option>)}</select>
          <select className="h-11 rounded-xl border border-border bg-card px-3 text-base sm:h-10 sm:text-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option value="all">全部考试</option>{examTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
          <div className="flex gap-2"><Button type="button" variant="outline" className="flex-1" onClick={exportExcel}><Download className="mr-2 h-4 w-4" />Excel</Button><Button type="button" variant="outline" className="flex-1" onClick={() => window.print()}>PDF</Button></div>
        </div>
        {scored.length >= 3 ? <div className="rounded-2xl border border-border p-3"><p className="flex items-center gap-2 text-sm font-medium"><TrendingUp className="h-4 w-4" />成绩趋势</p><div className="mt-3 flex h-24 items-end gap-2">{scored.slice(0, 12).reverse().map((value, index) => <div key={`${value}-${index}`} className="min-w-2 flex-1 rounded-t bg-primary/70" style={{ height: `${Math.max(8, Math.min(100, value))}%` }} title={`${value}%`} />)}</div></div> : null}
        <div className="space-y-2">
          {visible.map((record) => <div key={record.id} className="rounded-2xl border border-border p-3">
            <div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2"><Badge variant="outline">{childById.get(record.childId)}</Badge><Badge variant="secondary">{record.subject}</Badge><span className="text-xs text-muted-foreground">{record.date}</span></div><p className="mt-2 font-medium">{record.title}</p><p className="mt-1 text-sm text-muted-foreground">{record.score ?? "-"} / {record.maxScore ?? 100} · {percentage(record) ?? "-"}%</p></div>
            {confirmDeleteId === record.id ? <div className="flex flex-col gap-1"><Button size="sm" variant="destructive" onClick={() => remove(record.id)}>确认删除</Button><Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(null)}>取消</Button></div> : <div className="flex"><Button size="icon" variant="ghost" onClick={() => edit(record)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => setConfirmDeleteId(record.id)}><Trash2 className="h-4 w-4" /></Button></div>}</div>
            {record.notes ? <p className="mt-2 text-xs text-muted-foreground">{record.notes}</p> : null}
          </div>)}
          {!visible.length ? <p className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">暂无符合筛选条件的成绩。</p> : null}
        </div>
        {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}
        {showForm ? <form onSubmit={save} className="rounded-2xl border border-border p-4"><div className="mb-4 flex items-center justify-between"><p className="font-medium">{editingId ? "编辑成绩" : "录入成绩"}</p><button type="button" aria-label="关闭表单" className="-m-2 flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground" onClick={reset}><X className="h-4 w-4" /></button></div><div className="grid gap-4">
          <div><Label>孩子 *</Label><div className="mt-2 grid grid-cols-3 gap-2">{childProfiles.map((child) => <button key={child.id} type="button" onClick={() => setForm((v) => ({ ...v, childId: child.id }))} className={cn("min-h-11 rounded-xl border p-2 text-sm", form.childId === child.id ? "border-foreground bg-foreground text-background" : "border-border")}>{child.firstName}</button>)}</div></div>
          <div><Label>科目 *</Label><div className="mt-2 grid grid-cols-4 gap-2">{subjects.map((subject) => <button key={subject} type="button" onClick={() => setForm((v) => ({ ...v, subject }))} className={cn("min-h-11 rounded-xl border p-2 text-sm", form.subject === subject ? "border-foreground bg-foreground text-background" : "border-border")}>{subject}</button>)}</div>{form.subject === "其他" ? <Input className="mt-2" placeholder="输入科目" value={form.customSubject} onChange={(e) => setForm((v) => ({ ...v, customSubject: e.target.value }))} /> : null}</div>
          <div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="exam-title">考试名称 *</Label><Input id="exam-title" value={form.title} onChange={(e) => setForm((v) => ({ ...v, title: e.target.value }))} /></div><div><Label htmlFor="exam-date">日期 *</Label><Input id="exam-date" type="date" value={form.date} onChange={(e) => setForm((v) => ({ ...v, date: e.target.value }))} /></div></div>
          <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="score">得分 *</Label><Input id="score" inputMode="decimal" type="number" min="0" step="0.01" value={form.score} onChange={(e) => setForm((v) => ({ ...v, score: e.target.value }))} /></div><div><Label htmlFor="max-score">满分 *</Label><Input id="max-score" inputMode="decimal" type="number" min="1" step="0.01" value={form.maxScore} onChange={(e) => setForm((v) => ({ ...v, maxScore: e.target.value }))} /></div></div>
          <div><Label>考试类型</Label><div className="mt-2 flex gap-2 overflow-x-auto pb-1">{examTypes.map((item) => <button key={item.value} type="button" onClick={() => setForm((v) => ({ ...v, examType: item.value }))} className={cn("min-h-11 shrink-0 rounded-full border px-4 py-1.5 text-xs sm:min-h-9 sm:px-3", form.examType === item.value ? "border-foreground bg-foreground text-background" : "border-border")}>{item.label}</button>)}</div></div>
          <div><Label htmlFor="score-notes">备注</Label><Textarea id="score-notes" rows={2} value={form.notes} onChange={(e) => setForm((v) => ({ ...v, notes: e.target.value }))} /></div>
          <Button type="submit">保存成绩</Button>
        </div></form> : null}
      </CardContent>
    </Card>
  );
}
