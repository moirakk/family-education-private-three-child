import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: "blue" | "teal" | "amber" | "rose";
};

const toneClass = {
  blue: "bg-blue-50 text-blue-700 ring-blue-100",
  teal: "bg-teal-50 text-teal-700 ring-teal-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
  rose: "bg-rose-50 text-rose-700 ring-rose-100"
};

export function MetricCard({ title, value, detail, icon: Icon, tone = "blue" }: MetricCardProps) {
  return (
    <Card className="border-none bg-muted/60 shadow-none">
      <CardContent className="flex items-start justify-between gap-2 p-3 sm:gap-3 sm:p-4">
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground sm:text-sm">{title}</p>
          <p className="mt-1 text-xl font-semibold tracking-tight sm:mt-2 sm:text-2xl">{value}</p>
          <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground sm:text-xs">{detail}</p>
        </div>
        <div className={cn("rounded-md p-1.5 ring-1 sm:p-2", toneClass[tone])}>
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </div>
      </CardContent>
    </Card>
  );
}
