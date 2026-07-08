import { BookOpenCheck, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getChildTheme } from "@/lib/child-theme";
import type { Child, EducationGoal, LearningRecord } from "@/lib/types";

const minimumTrendWeeks = 4;

function getLearningWeekKey(dateString: string) {
  const [year, month, day] = dateString.slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = date.getUTCDay();
  const mondayOffset = (dayOfWeek + 6) % 7;

  date.setUTCDate(date.getUTCDate() - mondayOffset);
  return date.toISOString().slice(0, 10);
}

function getLearningWeekCount(records: LearningRecord[]) {
  return new Set(records.map((record) => getLearningWeekKey(record.date))).size;
}

export function GrowthSummary({
  childProfiles,
  records,
  goals
}: {
  childProfiles: Child[];
  records: LearningRecord[];
  goals: EducationGoal[];
}) {
  return (
    <Card id="growth" className="h-full border-border bg-card shadow-none">
      <CardHeader>
        <CardTitle>成长摘要</CardTitle>
        <CardDescription>按孩子查看学习稳定性和目标推进情况。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {childProfiles.map((child) => {
          const childRecords = records.filter((record) => record.childId === child.id);
          const childGoals = goals.filter((goal) => goal.childId === child.id);
          const averageProgress = childGoals.length
            ? Math.round(childGoals.reduce((sum, goal) => sum + goal.progress, 0) / childGoals.length)
            : 0;
          const minutes = childRecords.reduce((sum, record) => sum + record.durationMinutes, 0);
          const learningWeekCount = getLearningWeekCount(childRecords);
          const hasEnoughTrendData = learningWeekCount >= minimumTrendWeeks;
          const theme = getChildTheme(child);

          return (
            <div key={child.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={theme.dotStyle} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{child.firstName}</p>
                    <p className="truncate text-xs text-muted-foreground">{child.focusAreas.join(" · ")}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold">{hasEnoughTrendData ? `${averageProgress}%` : "积累中"}</span>
              </div>
              {hasEnoughTrendData ? (
                <Progress value={averageProgress} className="mt-3" />
              ) : (
                <div className="mt-3 rounded-xl bg-muted/50 px-3 py-2 text-xs leading-5 text-muted-foreground">
                  已有 {learningWeekCount} 周记录。满 {minimumTrendWeeks} 周后再显示趋势，避免用太少数据误判孩子状态。
                </div>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <BookOpenCheck className="h-3.5 w-3.5" />
                  {minutes} 分钟
                </span>
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {childGoals.length} 个目标
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
