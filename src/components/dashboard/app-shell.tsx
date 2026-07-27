"use client";

import {
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DashboardMode = "today" | "week" | "records" | "more";

const modeItems = [
  { mode: "today" as const, label: "今天", mobileLabel: "今天", description: "今日事项和下一步", icon: LayoutDashboard },
  { mode: "week" as const, label: "日程", mobileLabel: "日程", description: "月历和家庭安排", icon: CalendarDays },
  { mode: "records" as const, label: "记录", mobileLabel: "记录", description: "成绩、反馈和成长计划", icon: BookOpen },
  { mode: "more" as const, label: "设置", mobileLabel: "设置", description: "分享、备份和安装", icon: Settings }
];

const modeLabelByMode = new Map(modeItems.map((item) => [item.mode, item]));

const quickAddByMode: Partial<Record<DashboardMode, { label: string; target: DashboardMode }>> = {
  today: { label: "新增日程", target: "week" },
  week: { label: "新增日程", target: "week" },
  records: { label: "录入成绩", target: "records" }
};

const quickAddTargetIdByMode: Partial<Record<DashboardMode, string>> = {
  today: "event-planner",
  week: "event-planner",
  records: "learning-records"
};

export function AppShell({
  activeMode,
  children,
  onModeChange,
  workspaceLabel = "伯杨 · 仲杨 · 叔杨"
}: {
  activeMode: DashboardMode;
  children: React.ReactNode;
  onModeChange: (mode: DashboardMode, targetId?: string) => void;
  workspaceLabel?: string;
}) {
  const activeItem = modeLabelByMode.get(activeMode) ?? modeItems[0];
  const ActiveIcon = activeItem.icon;
  const quickAdd = quickAddByMode[activeMode];

  async function logout() {
    try {
      await fetch("/api/access", { method: "DELETE" });
    } finally {
      window.location.href = "/access";
    }
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="hidden border-r border-white/40 bg-gradient-to-b from-amber-50/80 via-orange-50/60 to-rose-50/50 px-4 py-5 backdrop-blur-xl dark:border-white/10 dark:from-white/[0.05] dark:via-white/[0.03] dark:to-white/[0.02] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto">
        <div className="rounded-2xl border border-white/50 bg-white/70 p-3 shadow-card backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/75 text-primary-foreground shadow-md shadow-primary/30">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-tight">Family Education</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{workspaceLabel}</p>
            </div>
          </div>
        </div>

        <div className="mt-7 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
          Workspace
        </div>
        <nav className="mt-2 space-y-1.5">
          {modeItems.map((item) => {
            const isActive = item.mode === activeMode;

            return (
              <button
                key={item.mode}
                type="button"
                onClick={() => onModeChange(item.mode)}
                className={cn(
                  "group relative flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-muted-foreground transition-all duration-300 hover:-translate-y-px hover:bg-white/60 hover:text-foreground dark:hover:bg-white/[0.06]",
                  isActive && "bg-white/80 text-foreground shadow-card backdrop-blur-xl hover:bg-white/80 dark:bg-white/[0.09] dark:hover:bg-white/[0.09]"
                )}
              >
                <span
                  className={cn(
                    "absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-transparent transition-all duration-200",
                    isActive && "bg-primary"
                  )}
                />
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/60 text-muted-foreground transition-all duration-300 group-hover:text-foreground dark:bg-white/[0.07]",
                    isActive && "bg-gradient-to-br from-primary to-primary/75 text-primary-foreground shadow-md shadow-primary/30 group-hover:text-primary-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate", isActive && "font-semibold")}>{item.label}</span>
                  <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
                    {item.description}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto pt-8">
          <div className="rounded-2xl border border-white/50 bg-gradient-to-br from-amber-100/60 via-orange-50/70 to-rose-100/50 p-3.5 backdrop-blur-sm dark:border-white/10 dark:from-white/[0.07] dark:via-white/[0.05] dark:to-white/[0.04]">
            <p className="text-xs font-semibold text-foreground">私有家庭工作区</p>
            <p className="mt-1.5 text-xs leading-5 text-muted-foreground">日程、成绩与家教反馈长期保存并定期备份。</p>
          </div>
          <Button type="button" variant="ghost" size="sm" className="mt-3 w-full justify-start gap-2 text-muted-foreground hover:text-foreground" onClick={() => void logout()}>
            <LogOut className="h-4 w-4" />
            退出登录
          </Button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-col overflow-x-hidden">
        <header className="sticky top-0 z-30 border-b border-white/40 bg-gradient-to-r from-amber-50/80 via-white/70 to-rose-50/70 px-3 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))] shadow-sm shadow-black/[0.03] backdrop-blur-xl dark:border-white/10 dark:from-white/[0.06] dark:via-white/[0.04] dark:to-white/[0.05] lg:hidden">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/75 text-primary-foreground shadow-md shadow-primary/30">
                <ActiveIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold tracking-tight">{activeItem.label}</p>
                <p className="truncate text-xs text-muted-foreground">{activeItem.description}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {quickAdd && (
                <Button size="sm" className="h-11 shrink-0 gap-1.5 rounded-full px-4" onClick={() => onModeChange(quickAdd.target, quickAddTargetIdByMode[activeMode])}>
                  <Plus className="h-3.5 w-3.5" />
                  {quickAdd.label}
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-11 w-11 shrink-0 rounded-full px-0 text-muted-foreground" aria-label="退出登录" onClick={() => void logout()}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>
        <main className="min-w-0 overflow-x-hidden px-3 py-4 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-6 lg:px-8 lg:py-7 lg:pb-10">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/40 bg-white/80 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-10px_30px_rgba(124,82,40,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-black/60 lg:hidden">
          <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
            {modeItems.map((item) => (
              <button
                key={item.mode}
                type="button"
                onClick={() => onModeChange(item.mode)}
                className={cn(
                  "flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground",
                  item.mode === activeMode && "bg-primary/10 font-semibold text-primary hover:bg-primary/10 hover:text-primary"
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
