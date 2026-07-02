import { GraduationCap, School } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getChildTheme } from "@/lib/child-theme";
import type { Child, EducationGoal, LearningRecord } from "@/lib/types";

export function ChildProfile({
  child,
  records,
  goals
}: {
  child: Child;
  records: LearningRecord[];
  goals: EducationGoal[];
}) {
  const childRecords = records.filter((record) => record.childId === child.id);
  const childGoals = goals.filter((goal) => goal.childId === child.id);
  const theme = getChildTheme(child);

  return (
    <Card className="h-full border-border bg-card shadow-none">
      <CardHeader>
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback style={{ ...theme.avatarBgStyle, ...theme.avatarTextStyle }}>{child.firstName.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{child.firstName} {child.lastName}</CardTitle>
            <CardDescription>{child.age} years old · {child.grade}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-border bg-muted/60 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <School className="h-4 w-4 text-primary" />
            学校信息
          </p>
          <p className="mt-2 text-sm">{child.schoolName}</p>
          <p className="text-xs text-muted-foreground">{child.schoolProgram}</p>
        </div>
        <div className="rounded-2xl border border-border bg-muted/60 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <GraduationCap className="h-4 w-4 text-primary" />
            关注重点
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {child.focusAreas.map((area) => (
              <Badge key={area} variant="outline">{area}</Badge>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-2xl font-semibold">{childRecords.length}</p>
            <p className="text-xs text-muted-foreground">近期学习记录</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-2xl font-semibold">{childGoals.length}</p>
            <p className="text-xs text-muted-foreground">教育目标</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
