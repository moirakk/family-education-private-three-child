import { format } from "date-fns";
import { CheckCircle2, Circle, Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Child, EducationGoal } from "@/lib/types";

export function EducationRoadmap({ goals, childProfiles }: { goals: EducationGoal[]; childProfiles: Child[] }) {
  const childById = new Map(childProfiles.map((child) => [child.id, child.firstName]));

  return (
    <Card id="roadmap" className="border-white/70 bg-white/85 shadow-sm backdrop-blur">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>教育路线图</CardTitle>
            <CardDescription>按孩子管理目标、里程碑和测评准备节奏。</CardDescription>
          </div>
          <Badge variant="success" className="gap-1">
            <Flag className="h-3 w-3" />
            {goals.length} 条路线
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-3">
          {goals.map((goal) => (
            <div key={goal.id} className="rounded-lg border bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{goal.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {childById.get(goal.childId)} · {goal.subject}
                  </p>
                </div>
                <Badge variant={goal.status === "planned" ? "outline" : "secondary"}>{goal.status.replace("_", " ")}</Badge>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>目标 {format(new Date(goal.targetDate), "MMM d")}</span>
                <span>{goal.progress}%</span>
              </div>
              <Progress value={goal.progress} className="mt-2" />
              <div className="mt-4 space-y-3">
                {goal.milestones.map((milestone) => (
                  <div key={milestone.id} className="flex items-start gap-2 text-sm">
                    {milestone.completed ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 text-slate-300" />
                    )}
                    <div>
                      <p className="font-medium">{milestone.title}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(milestone.dueDate), "MMM d, yyyy")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
