"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarPlus, Pencil, Trash2, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getChildTheme } from "@/lib/child-theme";
import { deletePrivateApi, isPrivateApiMode, postPrivateApi, putPrivateApi } from "@/lib/private-api-client";
import { getLocalOnlyItems } from "@/lib/reconciled-collection";
import type { CalendarEvent, Child, EventCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

type EventFormState = {
  title: string;
  category: EventCategory;
  startsAt: string;
  endsAt: string;
  location: string;
  childIds: string[];
  notes: string;
};

const storageKey = "family-education-private-events-v1";

const categoryOptions: { value: EventCategory; label: string }[] = [
  { value: "school", label: "学校" },
  { value: "tutoring", label: "辅导" },
  { value: "activity", label: "活动" },
  { value: "exam", label: "测评" },
  { value: "family", label: "家庭" }
];

const quickTitles: { category: EventCategory; title: string }[] = [
  { category: "school", title: "学校事项" },
  { category: "tutoring", title: "家教课" },
  { category: "activity", title: "课外活动" },
  { category: "exam", title: "考试/测评" },
  { category: "family", title: "家庭复盘" }
];

const initialForm: EventFormState = {
  title: "",
  category: "school",
  startsAt: "",
  endsAt: "",
  location: "",
  childIds: [],
  notes: ""
};

function toCalendarDate(value: string) {
  return new Date(value).toISOString();
}

function toDateTimeInputValue(value: string) {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toLocalInputValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function nextWeekendDate(day: 6 | 0, hour: number, minute = 0) {
  const now = new Date();
  const result = new Date(now);
  const distance = (day - now.getDay() + 7) % 7 || 7;
  result.setDate(now.getDate() + distance);
  result.setHours(hour, minute, 0, 0);
  return result;
}

function quickDateOptions() {
  const today = new Date();
  const tonight = new Date(today);
  tonight.setHours(18, 0, 0, 0);
  if (tonight < today) tonight.setDate(tonight.getDate() + 1);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  tomorrow.setHours(18, 0, 0, 0);

  return [
    { label: "今晚 18:00", value: tonight },
    { label: "明天 18:00", value: tomorrow },
    { label: "周六上午", value: nextWeekendDate(6, 10) },
    { label: "周日上午", value: nextWeekendDate(0, 10) }
  ];
}

function mapApiEvent(data: {
  id: string;
  title: string;
  category: CalendarEvent["category"];
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  childIds: string[];
}): CalendarEvent {
  return {
    id: data.id,
    title: data.title,
    category: data.category,
    startsAt: data.starts_at,
    endsAt: data.ends_at ?? undefined,
    location: data.location ?? "",
    childIds: data.childIds
  };
}

export function FamilyEventPlanner({
  childProfiles,
  onEventsChange,
  openFormRequest = 0
}: {
  childProfiles: Child[];
  onEventsChange: (events: CalendarEvent[]) => void;
  openFormRequest?: number;
}) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [form, setForm] = useState<EventFormState>(initialForm);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [syncStatus, setSyncStatus] = useState("");

  useEffect(() => {
    if (openFormRequest > 0) setShowForm(true);
  }, [openFormRequest]);

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as CalendarEvent[];
      const localEvents = isPrivateApiMode() ? getLocalOnlyItems(parsed) : parsed;
      setEvents(localEvents);
      onEventsChange(localEvents);
    } catch {
      setEvents([]);
      onEventsChange([]);
    }
  }, [onEventsChange]);

  useEffect(() => {
    const eventsToStore = isPrivateApiMode() ? getLocalOnlyItems(events) : events;
    window.localStorage.setItem(storageKey, JSON.stringify(eventsToStore));
    onEventsChange(events);
  }, [events, onEventsChange]);

  const selectedChildren = useMemo(
    () => childProfiles.filter((child) => form.childIds.includes(child.id)),
    [childProfiles, form.childIds]
  );

  function toggleChild(childId: string) {
    setForm((current) => ({
      ...current,
      childIds: current.childIds.includes(childId)
        ? current.childIds.filter((id) => id !== childId)
        : [...current.childIds, childId]
    }));
  }

  function selectQuickTitle(option: { category: EventCategory; title: string }) {
    setForm((current) => ({
      ...current,
      category: option.category,
      title: current.title || option.title
    }));
  }

  function selectQuickTime(date: Date) {
    setForm((current) => ({
      ...current,
      startsAt: toLocalInputValue(date),
      endsAt: current.endsAt || toLocalInputValue(addMinutes(date, 60))
    }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingEventId(null);
    setShowForm(false);
    setShowAdvanced(false);
  }

  function editEvent(event: CalendarEvent) {
    setEditingEventId(event.id);
    setShowForm(true);
    setForm({
      title: event.title,
      category: event.category,
      startsAt: toDateTimeInputValue(event.startsAt),
      endsAt: event.endsAt ? toDateTimeInputValue(event.endsAt) : "",
      location: event.location,
      childIds: event.childIds,
      notes: ""
    });
    setSyncStatus("");
    setShowAdvanced(true);
  }

  async function saveEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || !form.startsAt || form.childIds.length === 0) return;

    const nextEvent: CalendarEvent = {
      id: editingEventId ?? `local-event-${Date.now()}`,
      title: form.title.trim(),
      category: form.category,
      startsAt: toCalendarDate(form.startsAt),
      endsAt: form.endsAt ? toCalendarDate(form.endsAt) : undefined,
      location: form.location.trim() || "待补充地点",
      childIds: form.childIds
    };

    if (editingEventId) {
      const previousEvents = events;
      setEvents((current) =>
        current.map((currentEvent) => (currentEvent.id === editingEventId ? nextEvent : currentEvent)).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))
      );
      resetForm();

      if (isPrivateApiMode() && !editingEventId.startsWith("local-")) {
        try {
          setSyncStatus("正在同步日程修改...");
          const data = await putPrivateApi<Parameters<typeof mapApiEvent>[0]>(
            `/api/private/events?eventId=${encodeURIComponent(editingEventId)}`,
            { ...nextEvent, description: form.notes }
          );
          const savedEvent = mapApiEvent(data);
          setEvents((current) =>
            current.map((currentEvent) => (currentEvent.id === editingEventId ? savedEvent : currentEvent)).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))
          );
          setSyncStatus("日程修改已同步到数据库。");
        } catch (error) {
          setEvents(previousEvents);
          setSyncStatus(error instanceof Error ? `日程修改失败，已恢复：${error.message}` : "日程修改失败，已恢复。");
        }
      }
      return;
    }

    setEvents((current) => [...current, nextEvent].sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt)));
    resetForm();

    if (!isPrivateApiMode()) return;

    try {
      setSyncStatus("正在同步新日程到数据库...");
      const data = await postPrivateApi<Parameters<typeof mapApiEvent>[0]>("/api/private/events", {
        ...nextEvent,
        description: form.notes
      });
      const savedEvent = mapApiEvent(data);
      setEvents((current) =>
        current.map((currentEvent) => (currentEvent.id === nextEvent.id ? savedEvent : currentEvent)).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))
      );
      setSyncStatus("新日程已同步到数据库。");
    } catch (error) {
      setSyncStatus(error instanceof Error ? `本机已保存，数据库同步失败：${error.message}` : "本机已保存，数据库同步失败。");
    }
  }

  async function deleteEvent(eventId: string) {
    const previousEvents = events;
    setEvents((current) => current.filter((event) => event.id !== eventId));
    if (editingEventId === eventId) resetForm();

    if (isPrivateApiMode() && !eventId.startsWith("local-")) {
      try {
        setSyncStatus("正在从数据库删除日程...");
        await deletePrivateApi(`/api/private/events?eventId=${encodeURIComponent(eventId)}`);
        setSyncStatus("日程已从数据库删除。");
      } catch (error) {
        setEvents(previousEvents);
        setSyncStatus(error instanceof Error ? `删除失败，已恢复：${error.message}` : "删除失败，已恢复。");
      }
    }
  }

  return (
    <Card id="event-planner" className="overflow-hidden border-border bg-card shadow-none">
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarPlus className="h-4 w-4 text-primary" />
              日程编辑器
            </CardTitle>
          </div>
          <Badge variant="outline" className="w-fit rounded-full border-border bg-card">{events.length} 个新增事项</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">新增日程</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedChildren.length > 0 ? `正在编辑：${selectedChildren.map((child) => child.firstName).join("、")}` : "先看本周事项，需要时再补充"}
              </p>
            </div>
            <Button type="button" className="h-10 rounded-xl sm:w-auto" onClick={() => setShowForm(true)}>
              + 新增日程
            </Button>
          </div>
          {syncStatus && <p className="mt-3 text-xs text-muted-foreground">{syncStatus}</p>}
          <div className="mt-4 grid gap-3">
            {events.map((event) => (
              <div key={event.id} className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-muted/60 p-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-full border-border bg-card">{categoryOptions.find((category) => category.value === event.category)?.label}</Badge>
                    <p className="min-w-0 line-clamp-2 text-sm font-semibold">{event.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(event.startsAt).toLocaleString("zh-CN", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                    {" · "}
                    {event.location}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {event.childIds.map((childId) => {
                      const child = childProfiles.find((profile) => profile.id === childId);
                      if (!child) return null;
                      const theme = getChildTheme(child);
                      return (
                        <span key={childId} className="flex items-center gap-1 rounded-full bg-card px-2 py-1 text-xs text-muted-foreground ring-1 ring-border">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback style={{ ...theme.avatarBgStyle, ...theme.avatarTextStyle }}>{child.firstName.slice(0, 1)}</AvatarFallback>
                          </Avatar>
                          {child.firstName}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button type="button" variant="ghost" size="icon" className="rounded-full" onClick={() => editEvent(event)} aria-label="编辑日程">
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="rounded-full" onClick={() => deleteEvent(event.id)} aria-label="删除日程">
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
            {events.length === 0 && (
              <p className="rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
                还没有新增日程。今天可以边和家长沟通边补，补完后立刻进入总览和 iOS 日历订阅。
              </p>
            )}
          </div>
        </div>

        {showForm && (
          <form onSubmit={saveEvent} className="rounded-2xl border border-border bg-card p-3 shadow-sm shadow-black/[0.02] sm:p-4">
            <div className="grid gap-4">
              {editingEventId && (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-primary/10 px-3 py-2 text-sm text-primary">
                  正在编辑日程
                  <button type="button" onClick={resetForm} className="inline-flex items-center gap-1 text-xs font-medium">
                    <X className="h-3.5 w-3.5" />
                    取消
                  </button>
                </div>
              )}

            <div className="rounded-2xl bg-muted/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">快速录入</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                先选孩子、事项和时间；地点备注可以之后补。
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>1. 选择孩子</Label>
                <span className="text-xs text-muted-foreground">{form.childIds.length > 0 ? `已选 ${form.childIds.length} 个` : "必选"}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {childProfiles.map((child) => {
                  const theme = getChildTheme(child);
                  const active = form.childIds.includes(child.id);
                  return (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => toggleChild(child.id)}
                      className={cn(
                        "rounded-2xl border px-3 py-3 text-center text-sm font-semibold transition",
                        active ? "bg-card text-foreground shadow-sm" : "border-border bg-card text-muted-foreground"
                      )}
                      style={active ? { borderColor: theme.hex, ...theme.surfaceStyle } : undefined}
                    >
                      <span className="mx-auto mb-1 block h-2 w-2 rounded-full" style={theme.dotStyle} />
                      {child.firstName}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>2. 选择事项</Label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {quickTitles.map((option) => (
                  <button
                    key={`${option.category}-${option.title}`}
                    type="button"
                    onClick={() => selectQuickTitle(option)}
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition",
                      form.category === option.category ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground"
                    )}
                  >
                    {option.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_144px]">
              <div className="space-y-1.5">
                <Label htmlFor="event-title">事项名称</Label>
                <Input
                  id="event-title"
                  placeholder="例如：伯杨数学衔接课"
                  value={form.title}
                  className="h-11 rounded-xl"
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>类型</Label>
                <select
                  value={form.category}
                  className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm font-medium outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as EventCategory }))}
                >
                  {categoryOptions.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>3. 选择时间</Label>
              <div className="grid grid-cols-2 gap-2">
                {quickDateOptions().map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => selectQuickTime(option.value)}
                    className="rounded-xl border border-border bg-muted/60 px-3 py-2 text-left text-xs font-medium text-foreground transition hover:bg-muted"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="event-start">开始时间</Label>
              <Input
                id="event-start"
                type="datetime-local"
                value={form.startsAt}
                className="h-11 rounded-xl"
                onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))}
              />
            </div>
            <button
              type="button"
              className="w-fit text-sm font-medium text-primary"
              onClick={() => setShowAdvanced((current) => !current)}
            >
              {showAdvanced ? "收起更多设置" : "更多设置：地点、结束时间、备注"}
            </button>
            {showAdvanced && (
              <div className="grid gap-3 rounded-2xl border border-border bg-muted/60 p-3">
                <div className="space-y-1.5">
                  <Label htmlFor="event-location">地点</Label>
                  <Input
                    id="event-location"
                    placeholder="学校 / 家里 / 机构"
                    value={form.location}
                    className="h-11 rounded-xl bg-card"
                    onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="event-end">结束时间</Label>
                  <Input
                    id="event-end"
                    type="datetime-local"
                    value={form.endsAt}
                    className="h-11 rounded-xl bg-card"
                    onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="event-notes">现场备注</Label>
                  <Textarea
                    id="event-notes"
                    placeholder="可记录费用、接送、材料、老师提醒等。当前版本先作为现场记录，不进入 ICS。"
                    value={form.notes}
                    className="min-h-20 rounded-xl bg-card"
                    onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  />
                </div>
              </div>
            )}
            <Button className="h-11 rounded-xl" type="submit" disabled={!form.title.trim() || !form.startsAt || form.childIds.length === 0}>
              {editingEventId ? "保存日程修改" : "新增到日历"}
            </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
