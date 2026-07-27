import type { Urgency } from "./urgency";

export const urgencyLabels: Record<Urgency, string> = {
  critical: "紧急",
  warning: "本周",
  ok: "已安排",
  past: "已过"
};

export const urgencyBadgeClasses: Record<Urgency, string> = {
  critical: "border-destructive/30 bg-destructive/10 text-destructive",
  warning: "border-primary/30 bg-primary/10 text-primary",
  ok: "border-border bg-muted text-muted-foreground",
  past: "border-border bg-muted text-muted-foreground"
};
