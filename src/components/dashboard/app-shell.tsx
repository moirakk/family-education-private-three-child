"use client";

import {
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  LibraryBig,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DashboardMode = "today" | "week" | "records" | "more";

const modeItems = [
  { mode: "today" as const, label: "今天", mobileLabel: "今天", description: "今日事项和下一步", icon: LayoutDashboard },
  { mode: "week" as const, label: "本周", mobileLabel: "本周", description: "日程、周报和日历", icon: CalendarDays },
  { mode: "records" as const, label: "记录", mobileLabel: "记录", description: "学习、资料、反馈和档案", icon: BookOpen },
  { mode: "more" as const, label: "更多", mobileLabel: "更多", description: "补资料、导出和部署", icon: LibraryBig }
];

const modeLabelByMode = new Map(modeItems.map((item) => [item.mode, item]));

const quickAddByMode: Partial<Record<DashboardMode, { label: string; target: DashboardMode }>> = {
  today: { label: "新增日程", target: "week" },
  week: { label: "新增日程", target: "week" },
  records: { label: "新增记录", target: "records" }
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

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="hidden border-r border-border bg-card px-4 py-5 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto">
        <div className="rounded-2xl border border-border bg-muted/40 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-foreground text-background shadow-sm">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">Family Education</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{workspaceLabel}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Workspace
        </div>
        <nav className="mt-2 space-y-1">
          {modeItems.map((item) => {
            const isActive = item.mode === activeMode;

            return (
              <button
                key={item.mode}
                type="button"
                onClick={() => onModeChange(item.mode)}
                className={cn(
                  "group relative flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-muted-foreground transition duration-200 hover:bg-muted/70 hover:text-foreground",
                  isActive && "bg-foreground text-background shadow-sm hover:bg-foreground hover:text-background"
                )}
              >
                <span
                  className={cn(
                    "absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-transparent transition",
                    isActive && "bg-background/80"
                  )}
                />
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition duration-200 group-hover:text-foreground",
                    isActive && "bg-background/10 text-background group-hover:text-background"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{item.label}</span>
                  <span className={cn("mt-0.5 block truncate text-xs font-normal text-muted-foreground", isActive && "text-background/70")}>
                    {item.description}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto pt-8">
          <div className="rounded-2xl border border-border bg-muted/40 p-3">
            <p className="text-xs font-medium text-foreground">私有家庭工作区</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">数据由访问码保护；日程、资料和反馈统一沉淀。</p>
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-col overflow-x-hidden">
        <header className="sticky top-0 z-30 border-b border-border bg-card/90 px-3 py-2.5 backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
                <ActiveIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{activeItem.label}</p>
                <p className="truncate text-xs text-muted-foreground">{activeItem.description}</p>
              </div>
            </div>
            {quickAdd && (
              <Button size="sm" className="shrink-0 gap-1.5 rounded-full px-3" onClick={() => onModeChange(quickAdd.target, quickAddTargetIdByMode[activeMode])}>
                <Plus className="h-3.5 w-3.5" />
                {quickAdd.label}
              </Button>
            )}
          </div>
        </header>
        <main className="min-w-0 overflow-x-hidden px-3 py-3 pb-24 sm:px-6 sm:py-5 lg:px-8 lg:pb-8">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-10px_30px_rgba(0,0,0,0.06)] backdrop-blur-xl lg:hidden">
          <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
            {modeItems.map((item) => (
              <button
                key={item.mode}
                type="button"
                onClick={() => onModeChange(item.mode)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition duration-200 hover:bg-muted hover:text-foreground",
                  item.mode === activeMode && "bg-foreground text-background hover:bg-foreground hover:text-background"
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
