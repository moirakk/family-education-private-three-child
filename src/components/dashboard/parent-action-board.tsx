import { ClipboardCheck, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ParentAction = {
  id: string;
  owner: string;
  title: string;
  priority: string;
  status: string;
};

export function ParentActionBoard({ actions }: { actions: ParentAction[] }) {
  return (
    <Card className="border-white/70 bg-white/85 shadow-sm backdrop-blur">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              家长行动看板
            </CardTitle>
            <CardDescription>明天交付前优先补齐的关键事项。</CardDescription>
          </div>
          <Badge variant="warning" className="gap-1">
            <ShieldAlert className="h-3 w-3" />
            定制版优先
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {actions.map((action) => (
          <div key={action.id} className="rounded-lg border bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{action.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">负责人：{action.owner}</p>
              </div>
              <Badge variant={action.priority === "今天必须" ? "warning" : "outline"}>{action.priority}</Badge>
            </div>
            <p className="mt-4 text-xs font-medium text-primary">{action.status}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
