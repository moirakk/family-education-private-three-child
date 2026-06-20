"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarPlus, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CalendarEvent, Child, EventCategory } from "@/lib/types";

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

export function FamilyEventPlanner({
  childProfiles,
  onEventsChange
}: {
  childProfiles: Child[];
  onEventsChange: (events: CalendarEvent[]) => void;
}) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [form, setForm] = useState<EventFormState>(initialForm);

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as CalendarEvent[];
      setEvents(parsed);
      onEventsChange(parsed);
    } catch {
      setEvents([]);
      onEventsChange([]);
    }
  }, [onEventsChange]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(events));
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

  function addEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || !form.startsAt || form.childIds.length === 0) return;

    const newEvent: CalendarEvent = {
      id: `local-${Date.now()}`,
      title: form.title.trim(),
      category: form.category,
      startsAt: toCalendarDate(form.startsAt),
      endsAt: form.endsAt ? toCalendarDate(form.endsAt) : undefined,
      location: form.location.trim() || "待补充地点",
      childIds: form.childIds
    };

    setEvents((current) => [...current, newEvent].sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt)));
    setForm(initialForm);
  }

  function deleteEvent(eventId: string) {
    setEvents((current) => current.filter((event) => event.id !== eventId));
  }

  return (
    <Card id="event-planner" className="border-white/70 bg-white/85 shadow-sm backdrop-blur">
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarPlus className="h-4 w-4 text-primary" />
              日程编辑器
            </CardTitle>
            <CardDescription>
              今天家长可直接补课表、考试、活动和家庭事项；新增内容会进入页面日历和本机 ICS 导出。
            </CardDescription>
          </div>
          <Badge variant="outline">{events.length} 个本机新增事项</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <form onSubmit={addEvent} className="rounded-lg border bg-white p-4">
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="event-title">事项名称</Label>
              <Input
                id="event-title"
                placeholder="例如：伯杨数学衔接课"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>类型</Label>
                <Select
                  value={form.category}
                  onValueChange={(value) => setForm((current) => ({ ...current, category: value as EventCategory }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="event-location">地点</Label>
                <Input
                  id="event-location"
                  placeholder="学校 / 家里 / 机构"
                  value={form.location}
                  onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="event-start">开始时间</Label>
                <Input
                  id="event-start"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="event-end">结束时间</Label>
                <Input
                  id="event-end"
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>关联孩子</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {childProfiles.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => toggleChild(child.id)}
                    className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                      form.childIds.includes(child.id) ? "border-primary bg-primary/5 text-primary" : "bg-white text-slate-600"
                    }`}
                  >
                    {child.firstName}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="event-notes">现场备注</Label>
              <Textarea
                id="event-notes"
                placeholder="可记录费用、接送、材料、老师提醒等。当前版本先作为现场记录，不进入 ICS。"
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </div>
            <Button type="submit" disabled={!form.title.trim() || !form.startsAt || form.childIds.length === 0}>
              新增到日历
            </Button>
          </div>
        </form>

        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">本机新增日程</p>
            <p className="text-xs text-muted-foreground">
              {selectedChildren.length > 0 ? `正在编辑：${selectedChildren.map((child) => child.firstName).join("、")}` : "选择孩子后添加事项"}
            </p>
          </div>
          <div className="mt-4 grid gap-3">
            {events.map((event) => (
              <div key={event.id} className="flex items-start justify-between gap-3 rounded-md bg-slate-50 p-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{categoryOptions.find((category) => category.value === event.category)?.label}</Badge>
                    <p className="text-sm font-semibold">{event.title}</p>
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
                      return (
                        <span key={childId} className="flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs text-slate-600">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback style={{ backgroundColor: child.avatarColor }}>{child.firstName.slice(0, 1)}</AvatarFallback>
                          </Avatar>
                          {child.firstName}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => deleteEvent(event.id)} aria-label="删除日程">
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
            {events.length === 0 && (
              <p className="rounded-md bg-slate-50 p-4 text-sm text-muted-foreground">
                还没有本机新增日程。今天可以边和家长沟通边补，补完后立刻进入总览和 iOS 导出。
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
