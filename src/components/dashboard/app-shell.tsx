"use client";

import {
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  LibraryBig,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type DashboardMode = "today" | "week" | "records" | "more";

const modeItems = [
  { mode: "today" as const, label: "今天", mobileLabel: "今天", description: "今日事项和下一步", icon: LayoutDashboard },
  { mode: "week" as const, label: "本周", mobileLabel: "本周", description: "日程、周报和日历", icon: CalendarDays },
  { mode: "records" as const, label: "记录", mobileLabel: "记录", description: "学习、资料、反馈和档案", icon: BookOpen },
  { mode: "more" as const, label: "更多", mobileLabel: "更多", description: "补资料、导出和部署", icon: LibraryBig }
];

const modeLabelByMode = new Map(modeItems.map((item) => [item.mode, item]));

export function AppShell({
  activeMode,
  children,
  onModeChange
}: {
  activeMode: DashboardMode;
  children: React.ReactNode;
  onModeChange: (mode: DashboardMode) => void;
}) {
  const activeItem = modeLabelByMode.get(activeMode) ?? modeItems[0];

  return (
    <div className="min-h-screen w-full overflow-x-hidden lg:grid lg:grid-cols-[244px_minmax(0,1fr)]">
      <aside className="hidden border-r bg-white/80 px-4 py-5 backdrop-blur lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Family Education</p>
            <p className="text-xs text-muted-foreground">三孩定制工作区</p>
          </div>
        </div>
        <Separator className="my-5" />
        <nav className="space-y-1">
          {modeItems.map((item) => (
            <button
              key={item.mode}
              type="button"
              onClick={() => onModeChange(item.mode)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950",
                item.mode === activeMode && "bg-slate-100 text-slate-950"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>
                <span className="block">{item.label}</span>
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{item.description}</span>
              </span>
            </button>
          ))}
        </nav>
        <div className="mt-8 rounded-lg border bg-slate-950 p-4 text-white">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-cyan-300" />
            月度报告
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-300">定制版稳定后，生成面向家长的月度成长复盘。</p>
          <Button size="sm" variant="secondary" className="mt-4 w-full" onClick={() => onModeChange("more")}>
            预览
          </Button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-col overflow-x-hidden">
        <header className="sticky top-0 z-30 border-b bg-white/90 px-3 py-2.5 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Family Education</p>
                <p className="text-xs text-muted-foreground">{activeItem.description}</p>
              </div>
            </div>
            <Button size="sm" onClick={() => onModeChange("week")}>
              新增
            </Button>
          </div>
        </header>
        <main className="min-w-0 overflow-x-hidden px-3 py-3 pb-24 sm:px-6 sm:py-5 lg:px-8 lg:pb-8">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
          <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
            {modeItems.map((item) => (
              <button
                key={item.mode}
                type="button"
                onClick={() => onModeChange(item.mode)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                  item.mode === activeMode && "bg-slate-950 text-white shadow-sm hover:bg-slate-950 hover:text-white"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.mobileLabel}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
