"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { CalendarPlus, Pencil, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { deletePrivateApi, isPrivateApiMode, postPrivateApi, putPrivateApi } from "@/lib/private-api-client";
import type { CalendarEvent, Child, EventCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

type RepeatType = "none" | "daily" | "weekly" | "monthly" | "yearly" | "custom";
type FormState = {
  title: string; category: EventCategory; date: string; startTime: string; duration: string; customDuration: string;
  allDay: boolean; location: string; notes: string; childIds: string[]; repeat: RepeatType; repeatInterval: string;
  repeatEnd: "never" | "date" | "count"; repeatEndDate: string; repeatCount: string;
};

const categories: { value: EventCategory; label: string }[] = [
  { value: "school", label: "学校" }, { value: "tutoring", label: "辅导" }, { value: "activity", label: "活动" },
  { value: "exam", label: "测评" }, { value: "family", label: "家庭" }
];
const durations = [{ value: "30", label: "30 分钟" }, { value: "45", label: "45 分钟" }, { value: "60", label: "1 小时" }, { value: "90", label: "1.5 小时" }, { value: "custom", label: "自定义" }];
const repeats: { value: RepeatType; label: string }[] = [
  { value: "none", label: "不重复" }, { value: "daily", label: "每天" }, { value: "weekly", label: "每周" },
  { value: "monthly", label: "每月" }, { value: "yearly", label: "每年" }, { value: "custom", label: "自定义" }
];

function localDate() { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
function initialForm(): FormState { return { title: "", category: "school", date: localDate(), startTime: "10:00", duration: "60", customDuration: "60", allDay: false, location: "", notes: "", childIds: [], repeat: "none", repeatInterval: "1", repeatEnd: "never", repeatEndDate: "", repeatCount: "10" }; }
function localParts(value: string) { const date = new Date(value); const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString(); return { date: local.slice(0, 10), time: local.slice(11, 16) }; }
function startIso(form: FormState) { return new Date(`${form.date}T${form.allDay ? "00:00" : form.startTime}:00`).toISOString(); }
function durationMinutes(form: FormState) { return Number(form.duration === "custom" ? form.customDuration : form.duration) || 60; }
function recurrenceRule(form: FormState) {
  if (form.repeat === "none") return undefined;
  const frequency = form.repeat === "custom" ? "WEEKLY" : form.repeat.toUpperCase();
  const parts = [`FREQ=${frequency}`, `INTERVAL=${Math.max(1, Number(form.repeatInterval) || 1)}`];
  if (form.repeatEnd === "count") parts.push(`COUNT=${Math.max(1, Number(form.repeatCount) || 1)}`);
  if (form.repeatEnd === "date" && form.repeatEndDate) parts.push(`UNTIL=${form.repeatEndDate.replaceAll("-", "")}T235959Z`);
  return parts.join(";");
}
function repeatFromRule(rule?: string): RepeatType { const freq = rule?.match(/FREQ=([^;]+)/)?.[1]; return freq === "DAILY" ? "daily" : freq === "WEEKLY" ? "weekly" : freq === "MONTHLY" ? "monthly" : freq === "YEARLY" ? "yearly" : "none"; }
function formatEvent(event: CalendarEvent) { if (event.allDay) return `${new Date(event.startsAt).toLocaleDateString("zh-CN")} · 全天`; return new Date(event.startsAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }); }

function mapApi(data: { id: string; title: string; category: EventCategory; starts_at: string; ends_at: string | null; location: string | null; description: string | null; recurrence_rule: string | null; recurrence_end: string | null; all_day: boolean; childIds: string[] }): CalendarEvent {
  return { id: data.id, title: data.title, category: data.category, startsAt: data.starts_at, endsAt: data.ends_at ?? undefined, location: data.location ?? "", notes: data.description ?? undefined, recurrenceRule: data.recurrence_rule ?? undefined, recurrenceEnd: data.recurrence_end ?? undefined, allDay: data.all_day, childIds: data.childIds };
}

export function FamilyEventPlanner({ childProfiles, existingEvents = [], onEventsChange, openFormRequest = 0 }: {
  childProfiles: Child[]; existingEvents?: CalendarEvent[]; onEventsChange: (events: CalendarEvent[]) => void; openFormRequest?: number;
}) {
  const [events, setEvents] = useState<CalendarEvent[]>(existingEvents);
  const [form, setForm] = useState<FormState>(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [childFilter, setChildFilter] = useState("all");
  const loaded = useRef(false);

  useEffect(() => { if (!loaded.current && existingEvents.length) { loaded.current = true; setEvents(existingEvents); } }, [existingEvents]);
  useEffect(() => { if (openFormRequest > 0) setShowForm(true); }, [openFormRequest]);
  useEffect(() => { onEventsChange(events); }, [events, onEventsChange]);

  const visible = useMemo(() => events.filter((event) => childFilter === "all" || event.childIds.includes(childFilter)).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt)), [childFilter, events]);
  const now = Date.now();
  const upcoming = visible.filter((event) => +new Date(event.endsAt ?? event.startsAt) >= now);
  const history = visible.filter((event) => +new Date(event.endsAt ?? event.startsAt) < now).reverse();
  const issue = !form.childIds.length ? "请选择至少一个孩子。" : !form.title.trim() ? "请填写事项名称。" : !form.date ? "请选择日期。" : !form.allDay && !form.startTime ? "请选择开始时间。" : !form.allDay && durationMinutes(form) <= 0 ? "时长必须大于 0。" : form.repeatEnd === "date" && !form.repeatEndDate ? "请选择重复结束日期。" : "";

  function toggleChild(id: string) { setForm((value) => ({ ...value, childIds: value.childIds.includes(id) ? value.childIds.filter((item) => item !== id) : [...value.childIds, id] })); }
  function reset() { setForm(initialForm()); setEditingId(null); setShowForm(false); setAdvanced(false); }
  function edit(event: CalendarEvent) {
    const start = localParts(event.startsAt); const end = event.endsAt ? new Date(event.endsAt) : null;
    const minutes = end ? Math.max(1, Math.round((+end - +new Date(event.startsAt)) / 60000)) : 60;
    const repeat = repeatFromRule(event.recurrenceRule);
    setForm({ ...initialForm(), title: event.title, category: categories.some((item) => item.value === event.category) ? event.category : "school", date: start.date, startTime: start.time,
      duration: [30,45,60,90].includes(minutes) ? String(minutes) : "custom", customDuration: String(minutes), allDay: Boolean(event.allDay), location: event.location, notes: event.notes ?? "", childIds: event.childIds,
      repeat, repeatInterval: event.recurrenceRule?.match(/INTERVAL=(\d+)/)?.[1] ?? "1", repeatEnd: event.recurrenceRule?.includes("COUNT=") ? "count" : event.recurrenceRule?.includes("UNTIL=") ? "date" : "never",
      repeatEndDate: event.recurrenceEnd ?? "", repeatCount: event.recurrenceRule?.match(/COUNT=(\d+)/)?.[1] ?? "10" });
    setEditingId(event.id); setShowForm(true); setAdvanced(Boolean(event.location || event.notes || event.recurrenceRule));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (issue) { setStatus(issue); return; }
    const startsAt = startIso(form); const minutes = durationMinutes(form); const next: CalendarEvent = { id: editingId ?? `local-event-${Date.now()}`, title: form.title.trim(), category: form.category,
      startsAt, endsAt: form.allDay ? undefined : new Date(+new Date(startsAt) + minutes * 60000).toISOString(), location: form.location.trim(), notes: form.notes.trim() || undefined, childIds: form.childIds,
      allDay: form.allDay, recurrenceRule: recurrenceRule(form), recurrenceEnd: form.repeatEnd === "date" ? form.repeatEndDate : undefined };
    const previous = events; setEvents((items) => (editingId ? items.map((item) => item.id === editingId ? next : item) : [...items, next])); reset();
    if (!isPrivateApiMode()) { setStatus("日程已保存到当前设备。" ); return; }
    try { setStatus("正在保存日程..."); const payload = { ...next, description: next.notes };
      const data = editingId ? await putPrivateApi<Parameters<typeof mapApi>[0]>(`/api/private/events?eventId=${encodeURIComponent(editingId)}`, payload) : await postPrivateApi<Parameters<typeof mapApi>[0]>("/api/private/events", payload);
      const saved = mapApi(data); setEvents((items) => items.map((item) => item.id === next.id ? saved : item)); setStatus("日程已保存并进入 iOS 订阅源。" );
    } catch (error) { setEvents(previous); setStatus(error instanceof Error ? `保存失败，已恢复：${error.message}` : "保存失败，已恢复。" ); }
  }
  async function remove(id: string) { const previous = events; setConfirmDeleteId(null); setEvents((items) => items.filter((item) => item.id !== id)); if (!isPrivateApiMode() || id.startsWith("local-")) return;
    try { await deletePrivateApi(`/api/private/events?eventId=${encodeURIComponent(id)}`); setStatus("日程已删除。" ); } catch (error) { setEvents(previous); setStatus(error instanceof Error ? `删除失败：${error.message}` : "删除失败。" ); } }

  return <Card id="event-planner"><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle className="flex items-center gap-2"><CalendarPlus className="h-4 w-4" />日程</CardTitle><Button onClick={() => setShowForm(true)}><CalendarPlus className="mr-2 h-4 w-4" />新增日程</Button></div></CardHeader><CardContent className="space-y-4">
    <div className="flex gap-2 overflow-x-auto pb-1">{[{ id: "all", firstName: "全部" }, ...childProfiles].map((child) => <button key={child.id} type="button" onClick={() => setChildFilter(child.id)} className={cn("min-h-11 shrink-0 rounded-full border px-4 py-1.5 text-xs sm:min-h-9 sm:px-3", childFilter === child.id ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/25 transition-colors duration-200" : "border-border transition-colors duration-200 hover:border-muted-foreground/40 hover:bg-muted/50")}>{child.firstName}</button>)}</div>
    <EventList title="接下来" items={upcoming} childProfiles={childProfiles} edit={edit} confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} remove={remove} />
    {history.length ? <details className="rounded-2xl border border-border/70 bg-muted/20 p-3"><summary className="cursor-pointer rounded-lg text-sm font-medium transition-colors duration-200 hover:text-primary">历史日程（{history.length}）</summary><div className="mt-3"><EventList items={history} childProfiles={childProfiles} edit={edit} confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} remove={remove} /></div></details> : null}
    {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}
    {showForm ? <form onSubmit={save} className="rounded-2xl border border-border/70 bg-muted/20 p-4 shadow-sm shadow-black/[0.03]"><div className="mb-4 flex items-center justify-between"><p className="font-semibold tracking-tight">{editingId ? "编辑日程" : "新增日程"}</p><button type="button" aria-label="关闭表单" className="-m-2 flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground" onClick={reset}><X className="h-4 w-4" /></button></div><div className="grid gap-4">
      <div><Label>孩子 *</Label><div className="mt-2 grid grid-cols-3 gap-2">{childProfiles.map((child) => <button key={child.id} type="button" aria-pressed={form.childIds.includes(child.id)} onClick={() => toggleChild(child.id)} className={cn("min-h-11 rounded-xl border p-2.5 text-sm", form.childIds.includes(child.id) ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/25 transition-colors duration-200" : "border-border transition-colors duration-200 hover:border-muted-foreground/40 hover:bg-muted/50")}>{child.firstName}</button>)}</div></div>
      <div><Label>类型 *</Label><div className="mt-2 grid grid-cols-3 gap-2">{categories.map((item) => <button key={item.value} type="button" aria-pressed={form.category === item.value} onClick={() => setForm((v) => ({ ...v, category: item.value }))} className={cn("min-h-11 rounded-xl border p-2.5 text-sm", form.category === item.value ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/25 transition-colors duration-200" : "border-border transition-colors duration-200 hover:border-muted-foreground/40 hover:bg-muted/50")}>{item.label}</button>)}</div></div>
      <div><Label htmlFor="event-title">事项名称 *</Label><Input id="event-title" className="mt-2" value={form.title} onChange={(e) => setForm((v) => ({ ...v, title: e.target.value }))} /></div>
      <label className="flex items-center justify-between rounded-xl border border-border p-3 text-sm"><span>全天事项</span><input type="checkbox" className="h-5 w-5" checked={form.allDay} onChange={(e) => setForm((v) => ({ ...v, allDay: e.target.checked }))} /></label>
      <div className={cn("grid gap-3", !form.allDay && "grid-cols-2")}><div><Label htmlFor="event-date">日期 *</Label><Input id="event-date" className="mt-2" type="date" value={form.date} onChange={(e) => setForm((v) => ({ ...v, date: e.target.value }))} /></div>{!form.allDay ? <div><Label htmlFor="event-time">开始时间 *</Label><Input id="event-time" className="mt-2" type="time" value={form.startTime} onChange={(e) => setForm((v) => ({ ...v, startTime: e.target.value }))} /></div> : null}</div>
      {!form.allDay ? <div><Label>时长 *</Label><div className="mt-2 flex gap-2 overflow-x-auto pb-1">{durations.map((item) => <button key={item.value} type="button" aria-pressed={form.duration === item.value} onClick={() => setForm((v) => ({ ...v, duration: item.value }))} className={cn("min-h-11 shrink-0 rounded-full border px-4 py-1.5 text-xs sm:min-h-9 sm:px-3", form.duration === item.value ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/25 transition-colors duration-200" : "border-border transition-colors duration-200 hover:border-muted-foreground/40 hover:bg-muted/50")}>{item.label}</button>)}</div>{form.duration === "custom" ? <Input className="mt-2" type="number" min="1" inputMode="numeric" aria-label="自定义时长（分钟）" placeholder="分钟" value={form.customDuration} onChange={(e) => setForm((v) => ({ ...v, customDuration: e.target.value }))} /> : null}</div> : null}
      <button type="button" className="-my-1 min-h-11 w-fit py-1 text-sm font-medium text-primary" onClick={() => setAdvanced((value) => !value)}>{advanced ? "收起更多设置" : "更多设置：地点、备注、重复"}</button>
      {advanced ? <div className="grid gap-4 rounded-2xl bg-muted/40 p-4"><div><Label htmlFor="event-location">地点</Label><Input id="event-location" className="mt-2" value={form.location} onChange={(e) => setForm((v) => ({ ...v, location: e.target.value }))} /></div><div><Label htmlFor="event-notes">备注</Label><Textarea id="event-notes" className="mt-2" rows={2} value={form.notes} onChange={(e) => setForm((v) => ({ ...v, notes: e.target.value }))} /></div>
        <div><Label>重复</Label><div className="mt-2 flex gap-2 overflow-x-auto pb-1">{repeats.map((item) => <button key={item.value} type="button" aria-pressed={form.repeat === item.value} onClick={() => setForm((v) => ({ ...v, repeat: item.value }))} className={cn("min-h-11 shrink-0 rounded-full border px-4 py-1.5 text-xs sm:min-h-9 sm:px-3", form.repeat === item.value ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/25 transition-colors duration-200" : "border-border transition-colors duration-200 hover:border-muted-foreground/40 hover:bg-muted/50")}>{item.label}</button>)}</div></div>
        {form.repeat !== "none" ? <><div><Label htmlFor="repeat-interval">间隔</Label><Input id="repeat-interval" className="mt-2" type="number" min="1" value={form.repeatInterval} onChange={(e) => setForm((v) => ({ ...v, repeatInterval: e.target.value }))} /></div><div><Label>结束重复</Label><select aria-label="结束重复" className="mt-2 h-11 w-full rounded-xl border border-border bg-card px-3 text-base sm:h-10 sm:text-sm" value={form.repeatEnd} onChange={(e) => setForm((v) => ({ ...v, repeatEnd: e.target.value as FormState["repeatEnd"] }))}><option value="never">永不</option><option value="date">指定日期</option><option value="count">指定次数</option></select></div>{form.repeatEnd === "date" ? <Input type="date" aria-label="重复结束日期" value={form.repeatEndDate} onChange={(e) => setForm((v) => ({ ...v, repeatEndDate: e.target.value }))} /> : null}{form.repeatEnd === "count" ? <Input type="number" min="1" aria-label="重复次数" value={form.repeatCount} onChange={(e) => setForm((v) => ({ ...v, repeatCount: e.target.value }))} /> : null}</> : null}
      </div> : null}
      <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-sm"><p className="font-medium text-foreground">保存预览</p><p className="mt-1 text-muted-foreground">{form.date}{form.allDay ? " · 全天" : ` · ${form.startTime} · ${durationMinutes(form)} 分钟`}{form.repeat !== "none" ? ` · ${repeats.find((item) => item.value === form.repeat)?.label}` : ""}</p></div>
      {issue ? <p className="text-sm text-destructive">{issue}</p> : null}<Button type="submit">保存日程</Button>
    </div></form> : null}
  </CardContent></Card>;
}

function EventList({ title, items, childProfiles, edit, confirmDeleteId, setConfirmDeleteId, remove }: { title?: string; items: CalendarEvent[]; childProfiles: Child[]; edit: (event: CalendarEvent) => void; confirmDeleteId: string | null; setConfirmDeleteId: (id: string | null) => void; remove: (id: string) => void }) {
  const childById = new Map(childProfiles.map((child) => [child.id, child.firstName]));
  return <div className="space-y-2">{title ? <p className="text-sm font-semibold tracking-tight">{title}</p> : null}{items.map((event) => <div key={event.id} className="rounded-2xl border border-border/70 bg-card p-3 shadow-sm shadow-black/[0.03] transition-shadow duration-200 hover:shadow-md hover:shadow-black/[0.06]"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{categories.find((item) => item.value === event.category)?.label ?? "历史"}</Badge><p className="font-medium">{event.title}</p></div><p className="mt-1 text-xs tabular-nums text-muted-foreground">{formatEvent(event)}{event.location ? ` · ${event.location}` : ""}</p><p className="mt-1 text-xs text-muted-foreground">{event.childIds.map((id) => childById.get(id)).filter(Boolean).join("、")}{event.recurrenceRule ? " · 重复" : ""}</p></div>{confirmDeleteId === event.id ? <div className="flex flex-col gap-1"><Button size="sm" variant="destructive" onClick={() => remove(event.id)}>确认删除</Button><Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(null)}>取消</Button></div> : <div className="flex"><Button size="icon" variant="ghost" aria-label={`编辑日程：${event.title}`} onClick={() => edit(event)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label={`删除日程：${event.title}`} onClick={() => setConfirmDeleteId(event.id)}><Trash2 className="h-4 w-4" /></Button></div>}</div>{event.notes ? <p className="mt-2 text-xs text-muted-foreground">{event.notes}</p> : null}</div>)}{!items.length ? <p className="rounded-xl border border-dashed border-border bg-muted/40 p-5 text-center text-sm text-muted-foreground dark:border-white/15 dark:bg-white/[0.04]">还没有日程，点右上角「新增日程」开始安排吧。</p> : null}</div>;
}
