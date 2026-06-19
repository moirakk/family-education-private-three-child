import { ArrowRight, UsersRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Child } from "@/lib/types";

type OperatingPlan = {
  childId: string;
  stage: string;
  weeklyFocus: string;
  parentRole: string;
  risk: string;
  nextStep: string;
};

export function ThreeChildOperatingMatrix({
  childProfiles,
  plans
}: {
  childProfiles: Child[];
  plans: OperatingPlan[];
}) {
  const childById = new Map(childProfiles.map((child) => [child.id, child]));

  return (
    <Card className="border-white/70 bg-white/85 shadow-sm backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UsersRound className="h-4 w-4 text-primary" />
          伯仲叔三人管理矩阵
        </CardTitle>
        <CardDescription>按孩子阶段拆分目标、风险和家长介入方式。</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const child = childById.get(plan.childId);
          if (!child) return null;

          return (
            <div key={plan.childId} className="rounded-lg border bg-white p-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback style={{ backgroundColor: child.avatarColor }}>{child.firstName}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold">{child.firstName}</p>
                  <p className="text-xs text-muted-foreground">{plan.stage}</p>
                </div>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <Badge variant="outline">本周重点</Badge>
                  <p className="mt-2 font-medium">{plan.weeklyFocus}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">家长角色</p>
                  <p className="mt-1">{plan.parentRole}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">风险信号</p>
                  <p className="mt-1">{plan.risk}</p>
                </div>
                <div className="rounded-md bg-slate-50 p-3">
                  <p className="flex items-center gap-2 text-xs font-semibold text-primary">
                    <ArrowRight className="h-3.5 w-3.5" />
                    下一步
                  </p>
                  <p className="mt-1 text-xs text-slate-600">{plan.nextStep}</p>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
