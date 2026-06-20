"use client";

import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  FileDown,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  LineChart,
  Map,
  MessageSquareText,
  SmilePlus,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "#dashboard", label: "总览", icon: LayoutDashboard },
  { href: "#intake", label: "补资料", icon: ClipboardList },
  { href: "#calendar", label: "统一日历", icon: CalendarDays },
  { href: "#learning-records", label: "学习记录", icon: BookOpen },
  { href: "#export-preview", label: "导出预览", icon: FileDown },
  { href: "#materials", label: "资料库", icon: LibraryBig },
  { href: "#self-evaluation", label: "自我评价", icon: SmilePlus },
  { href: "#tutor-feedback", label: "家教反馈", icon: MessageSquareText },
  { href: "#children", label: "孩子档案", icon: GraduationCap },
  { href: "#growth", label: "成长记录", icon: LineChart },
  { href: "#roadmap", label: "教育路线", icon: Map },
  { href: "#calendar-sync", label: "iOS 同步", icon: CalendarDays },
  { href: "#resources", label: "资源中心", icon: FileText }
];

const navGroups = [
  { label: "每天使用", items: navItems.slice(0, 5) },
  { label: "记录沉淀", items: navItems.slice(5, 9) },
  { label: "长期规划", items: navItems.slice(9) }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[244px_1fr]">
      <aside className="hidden border-r bg-white/80 px-4 py-5 backdrop-blur lg:block">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">伯仲叔教育管理</p>
            <p className="text-xs text-muted-foreground">三孩定制工作区</p>
          </div>
        </div>
        <Separator className="my-5" />
        <nav className="space-y-5">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{group.label}</p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950",
                      item.href === "#dashboard" && "bg-slate-100 text-slate-950"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-8 rounded-lg border bg-slate-950 p-4 text-white">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-cyan-300" />
            月度报告
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-300">定制版稳定后，生成面向家长的月度成长复盘。</p>
          <Button size="sm" variant="secondary" className="mt-4 w-full">
            预览
          </Button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 border-b bg-white/85 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">伯仲叔教育管理</p>
                <p className="text-xs text-muted-foreground">本周</p>
              </div>
            </div>
            <Button asChild size="sm">
              <a href="#event-planner">新增</a>
            </Button>
          </div>
        </header>
        <main className="min-w-0 px-4 py-5 pb-24 sm:px-6 lg:px-8 lg:pb-8">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/90 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur lg:hidden">
          <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
            {[navItems[0], navItems[2], navItems[3], navItems[5]].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </a>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
