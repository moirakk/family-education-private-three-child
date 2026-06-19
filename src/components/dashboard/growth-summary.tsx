import { BookOpenCheck, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Child, EducationGoal, LearningRecord } from "@/lib/types";

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
    <Card id="growth" className="h-full border-white/70 bg-white/85 shadow-sm backdrop-blur">
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

          return (
            <div key={child.id} className="rounded-lg border bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{child.firstName}</p>
                  <p className="text-xs text-muted-foreground">{child.focusAreas.join(" · ")}</p>
                </div>
                <span className="text-sm font-semibold">{averageProgress}%</span>
              </div>
              <Progress value={averageProgress} className="mt-3" />
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
