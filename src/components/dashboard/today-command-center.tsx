"use client";

import { ArrowRight, CalendarPlus, ClipboardList, FileDown, LibraryBig, MessageSquareText, SmilePlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CalendarEvent, Child, LearningRecord } from "@/lib/types";

const quickActions = [
  { href: "#event-planner", label: "新增日程", icon: CalendarPlus, tone: "bg-blue-50 text-blue-700" },
  { href: "#learning-records", label: "记录学习", icon: ClipboardList, tone: "bg-teal-50 text-teal-700" },
  { href: "#materials", label: "上传资料", icon: LibraryBig, tone: "bg-violet-50 text-violet-700" },
  { href: "#export-preview", label: "查看导出", icon: FileDown, tone: "bg-slate-100 text-slate-700" }
];

export function TodayCommandCenter({
  childProfiles,
  events,
  records
}: {
  childProfiles: Child[];
  events: CalendarEvent[];
  records: LearningRecord[];
}) {
  const nextEvents = events.slice(0, 3);

  return (
    <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-lg border border-white/80 bg-white/90 p-4 shadow-sm backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-950">今天先做什么</p>
            <p className="mt-1 text-sm text-muted-foreground">家长日常高频入口集中在这里。</p>
          </div>
          <Badge variant="outline">今日工作台</Badge>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {quickActions.map((action) => (
            <Button key={action.href} asChild variant="outline" className="h-auto justify-between rounded-lg bg-white px-3 py-3">
              <a href={action.href}>
                <span className="flex items-center gap-3">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-md ${action.tone}`}>
                    <action.icon className="h-4 w-4" />
                  </span>
                  <span>{action.label}</span>
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </a>
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-white/80 bg-slate-950 p-4 text-white shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">下一步提醒</p>
            <p className="mt-1 text-xs text-slate-300">按时间优先处理，不用翻完整页面。</p>
          </div>
          <Badge variant="secondary">{nextEvents.length} 项</Badge>
        </div>
        <div className="mt-4 grid gap-2">
          {nextEvents.map((event) => (
            <a key={event.id} href="#calendar" className="rounded-md bg-white/10 p-3 transition hover:bg-white/15">
              <p className="text-sm font-medium">{event.title}</p>
              <p className="mt-1 text-xs text-slate-300">
                {new Date(event.startsAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </p>
            </a>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-300">
          <a href="#self-evaluation" className="flex items-center gap-2 rounded-md bg-white/10 p-2 hover:bg-white/15">
            <SmilePlus className="h-4 w-4" />
            孩子自评
          </a>
          <a href="#tutor-feedback" className="flex items-center gap-2 rounded-md bg-white/10 p-2 hover:bg-white/15">
            <MessageSquareText className="h-4 w-4" />
            家教反馈
          </a>
        </div>
      </div>

      <div className="xl:col-span-2 grid gap-3 sm:grid-cols-3">
        {childProfiles.map((child) => {
          const childEvents = events.filter((event) => event.childIds.includes(child.id)).length;
          const minutes = records.filter((record) => record.childId === child.id).reduce((sum, record) => sum + record.durationMinutes, 0);

          return (
            <a key={child.id} href="#children" className="rounded-lg border border-white/80 bg-white/80 p-4 shadow-sm transition hover:bg-white">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{child.firstName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{child.grade}</p>
                </div>
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: child.avatarColor }} />
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary">{childEvents} 个事项</Badge>
                <Badge variant="outline">{minutes} 分钟</Badge>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
