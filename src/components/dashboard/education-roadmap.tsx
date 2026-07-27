"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, Pencil, Plus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { todayIsoDate as today } from "@/lib/date-utils";
import { deletePrivateApi, isPrivateApiMode, postPrivateApi, putPrivateApi } from "@/lib/private-api-client";
import type { Child, EducationGoal, GoalStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type PlanType = NonNullable<EducationGoal["planType"]>;
type FormState = { childId: string; title: string; targetDate: string; planType: PlanType; customType: string; status: "planned" | "achieved" | "cancelled"; syncToCalendar: boolean };
const planTypes: { value: PlanType; label: string }[] = [{ value: "exam", label: "考试" }, { value: "competition", label: "比赛" }, { value: "school", label: "升学" }, { value: "other", label: "其他" }];
const statusLabels: Record<string, string> = { planned: "计划中", achieved: "已完成", cancelled: "已取消", in_progress: "计划中", at_risk: "计划中" };
function initial(children: Child[]): FormState { return { childId: children[0]?.id ?? "", title: "", targetDate: today(), planType: "exam", customType: "", status: "planned", syncToCalendar: true }; }

export function EducationRoadmap({ goals, childProfiles, onGoalsChange }: { goals: EducationGoal[]; childProfiles: Child[]; onGoalsChange?: (goals: EducationGoal[]) => void }) {
  const [items, setItems] = useState(goals);
  const [form, setForm] = useState(() => initial(childProfiles));
  const [selectedChild, setSelectedChild] = useState(childProfiles[0]?.id ?? "");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  useEffect(() => setItems(goals), [goals]);
  const visible = useMemo(() => items.filter((item) => item.childId === selectedChild).sort((a, b) => a.targetDate.localeCompare(b.targetDate)), [items, selectedChild]);
  const upcoming = visible.filter((item) => !["achieved", "cancelled"].includes(item.status));
  const history = visible.filter((item) => ["achieved", "cancelled"].includes(item.status)).reverse();
  function update(next: EducationGoal[]) { setItems(next); onGoalsChange?.(next); }
  function reset() { setForm(initial(childProfiles)); setEditingId(null); setShowForm(false); }
  function edit(item: EducationGoal) { setForm({ childId: item.childId, title: item.title, targetDate: item.targetDate || today(), planType: item.planType ?? "other", customType: item.customType ?? "", status: item.status === "achieved" || item.status === "cancelled" ? item.status : "planned", syncToCalendar: item.syncToCalendar !== false }); setEditingId(item.id); setShowForm(true); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!form.childId || !form.title.trim() || !form.targetDate || (form.planType === "other" && !form.customType.trim())) { setStatus("请完整填写孩子、类型、事项名称和日期。" ); return; }
    const next: EducationGoal = { id: editingId ?? `local-goal-${Date.now()}`, childId: form.childId, title: form.title.trim(), targetDate: form.targetDate, subject: form.planType === "other" ? form.customType.trim() : planTypes.find((item) => item.value === form.planType)?.label ?? "其他", status: form.status as GoalStatus, progress: form.status === "achieved" ? 100 : 0, milestones: [], planType: form.planType, customType: form.planType === "other" ? form.customType.trim() : undefined, syncToCalendar: form.syncToCalendar };
    const previous = items; update(editingId ? items.map((item) => item.id === editingId ? next : item) : [...items, next]); reset();
    if (!isPrivateApiMode()) return;
    try { setStatus("正在保存成长计划..."); const saved = editingId ? await putPrivateApi<EducationGoal>(`/api/private/roadmap?goalId=${encodeURIComponent(editingId)}`, next) : await postPrivateApi<EducationGoal>("/api/private/roadmap", next); update((editingId ? previous.filter((item) => item.id !== editingId) : previous).concat(saved)); setStatus("成长计划已保存。" ); }
    catch (error) { console.error("Failed to save education goal:", error); update(previous); setStatus("保存失败，请重试。"); }
  }
  async function remove(id: string) { const previous = items; setConfirmDeleteId(null); update(items.filter((item) => item.id !== id)); if (!isPrivateApiMode() || id.startsWith("local-")) return; try { await deletePrivateApi(`/api/private/roadmap?goalId=${encodeURIComponent(id)}`); setStatus("成长计划已删除。" ); } catch (error) { console.error("Failed to delete education goal:", error); update(previous); setStatus("删除失败，请重试。"); } }
  return <Card id="roadmap"><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle>成长计划</CardTitle><Button onClick={() => setShowForm(true)}><Plus className="mr-2 h-4 w-4" />新增计划</Button></div></CardHeader><CardContent className="space-y-4">
    <div className="grid grid-cols-3 gap-2">{childProfiles.map((child) => <button key={child.id} type="button" onClick={() => setSelectedChild(child.id)} className={cn("min-h-11 rounded-xl border p-2.5 text-sm", selectedChild === child.id ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/25 transition-colors duration-200" : "border-border transition-colors duration-200 hover:border-muted-foreground/40 hover:bg-muted/50")}>{child.firstName}</button>)}</div>
    <PlanList items={upcoming} edit={edit} confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} remove={remove} />
    {history.length ? <details className="rounded-2xl border border-border/70 bg-muted/20 p-3"><summary className="cursor-pointer rounded-lg text-sm font-medium transition-colors duration-200 hover:text-primary">历史计划（{history.length}）</summary><div className="mt-3"><PlanList items={history} edit={edit} confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} remove={remove} /></div></details> : null}
    {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}
    {showForm ? <form onSubmit={save} className="rounded-2xl border border-border/70 bg-muted/20 p-4 shadow-sm shadow-black/[0.03]"><div className="mb-4 flex items-center justify-between"><p className="font-semibold tracking-tight">{editingId ? "编辑计划" : "新增计划"}</p><button type="button" aria-label="关闭表单" className="-m-2 flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground" onClick={reset}><X className="h-4 w-4" /></button></div><div className="grid gap-4">
      <div><Label>孩子 *</Label><div className="mt-2 grid grid-cols-3 gap-2">{childProfiles.map((child) => <button key={child.id} type="button" aria-pressed={form.childId === child.id} onClick={() => setForm((v) => ({ ...v, childId: child.id }))} className={cn("min-h-11 rounded-xl border p-2 text-sm", form.childId === child.id ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/25 transition-colors duration-200" : "border-border transition-colors duration-200 hover:border-muted-foreground/40 hover:bg-muted/50")}>{child.firstName}</button>)}</div></div>
      <div><Label>类型 *</Label><div className="mt-2 grid grid-cols-4 gap-2">{planTypes.map((item) => <button key={item.value} type="button" aria-pressed={form.planType === item.value} onClick={() => setForm((v) => ({ ...v, planType: item.value }))} className={cn("min-h-11 rounded-xl border p-2 text-sm", form.planType === item.value ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/25 transition-colors duration-200" : "border-border transition-colors duration-200 hover:border-muted-foreground/40 hover:bg-muted/50")}>{item.label}</button>)}</div>{form.planType === "other" ? <Input className="mt-2" aria-label="自定义类型" placeholder="自定义类型" value={form.customType} onChange={(e) => setForm((v) => ({ ...v, customType: e.target.value }))} /> : null}</div>
      <div><Label htmlFor="plan-title">计划名称 *</Label><Input id="plan-title" className="mt-2" placeholder="例如：KET 考试" value={form.title} onChange={(e) => setForm((v) => ({ ...v, title: e.target.value }))} /></div>
      <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="plan-date">日期 *</Label><Input id="plan-date" className="mt-2" type="date" value={form.targetDate} onChange={(e) => setForm((v) => ({ ...v, targetDate: e.target.value }))} /></div><div><Label>状态</Label><select aria-label="状态" className="mt-2 h-11 w-full rounded-xl border border-border bg-card px-3 text-base sm:h-10 sm:text-sm" value={form.status} onChange={(e) => setForm((v) => ({ ...v, status: e.target.value as FormState["status"] }))}><option value="planned">计划中</option><option value="achieved">已完成</option><option value="cancelled">已取消</option></select></div></div>
      <label className="flex items-center justify-between rounded-xl border border-border p-3 text-sm"><span>同步到 iOS 日历</span><input type="checkbox" className="h-5 w-5" checked={form.syncToCalendar} onChange={(e) => setForm((v) => ({ ...v, syncToCalendar: e.target.checked }))} /></label>
      <Button type="submit">保存计划</Button>
    </div></form> : null}
  </CardContent></Card>;
}

function PlanList({ items, edit, confirmDeleteId, setConfirmDeleteId, remove }: { items: EducationGoal[]; edit: (item: EducationGoal) => void; confirmDeleteId: string | null; setConfirmDeleteId: (id: string | null) => void; remove: (id: string) => void }) {
  return <div className="space-y-2">{items.map((item) => <div key={item.id} className="rounded-2xl border border-border/70 bg-card p-3 shadow-sm shadow-black/[0.03] transition-shadow duration-200 hover:shadow-md hover:shadow-black/[0.06]"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{item.planType === "other" ? item.customType || "其他" : planTypes.find((type) => type.value === item.planType)?.label || item.subject}</Badge><Badge variant="secondary">{statusLabels[item.status]}</Badge>{item.syncToCalendar !== false ? <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" /> : null}</div><p className="mt-2 font-medium">{item.title}</p><p className="mt-1 text-xs tabular-nums text-muted-foreground">{item.targetDate}{item.status === "planned" && item.targetDate < today() ? " · 已逾期" : ""}</p></div>{confirmDeleteId === item.id ? <div className="flex flex-col gap-1"><Button size="sm" variant="destructive" onClick={() => remove(item.id)}>确认删除</Button><Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(null)}>取消</Button></div> : <div className="flex"><Button size="icon" variant="ghost" aria-label={`编辑计划：${item.title}`} onClick={() => edit(item)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label={`删除计划：${item.title}`} onClick={() => setConfirmDeleteId(item.id)}><Trash2 className="h-4 w-4" /></Button></div>}</div></div>)}{!items.length ? <p className="rounded-xl border border-dashed border-border bg-muted/40 p-5 text-center text-sm text-muted-foreground dark:border-white/15 dark:bg-white/[0.04]">还没有计划，为孩子定一个小目标吧。</p> : null}</div>;
}
