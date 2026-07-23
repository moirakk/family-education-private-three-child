"use client";

import { getChildTheme } from "@/lib/child-theme";
import type { Child } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { ChildFilter } from "./use-learning-materials";

export function MaterialChildFilter({
  childProfiles,
  activeChildFilter,
  onFilterChange
}: {
  childProfiles: Child[];
  activeChildFilter: ChildFilter;
  onFilterChange: (filter: ChildFilter) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      <button
        type="button"
        onClick={() => onFilterChange("all")}
        className={cn(
          "shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition",
          activeChildFilter === "all" ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground"
        )}
      >
        全部资料
      </button>
      <button
        type="button"
        onClick={() => onFilterChange("family")}
        className={cn(
          "shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition",
          activeChildFilter === "family" ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground"
        )}
      >
        全家
      </button>
      {childProfiles.map((child) => {
        const theme = getChildTheme(child);
        const active = activeChildFilter === child.id;
        return (
          <button
            key={child.id}
            type="button"
            onClick={() => onFilterChange(child.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition",
              active ? "bg-card text-foreground shadow-sm" : "border-border bg-card text-muted-foreground"
            )}
            style={active ? { borderColor: theme.hex, ...theme.surfaceStyle } : undefined}
          >
            <span className="h-2 w-2 rounded-full" style={theme.dotStyle} />
            {child.firstName}
          </button>
        );
      })}
    </div>
  );
}
