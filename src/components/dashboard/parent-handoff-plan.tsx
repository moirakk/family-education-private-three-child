import { CalendarSync, LockKeyhole, PencilLine, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const handoffSteps = [
  {
    title: "今天现场编辑",
    icon: PencilLine,
    badge: "当前可用",
    description: "家长直接在工作台里补学校、课表、重要日期和关注点，浏览器会自动保存。",
    details: ["编辑孩子档案", "补充三孩日程框架", "导出本地 JSON 备份", "复制周报框架"]
  },
  {
    title: "做好后安全分享",
    icon: Share2,
    badge: "下一步",
    description: "使用私有 Vercel 链接或现场本地演示，公开 GitHub 只保留通用版。",
    details: ["私有链接给家长", "只读周报用于转发", "敏感信息不进 public repo", "必要时加访问码"]
  },
  {
    title: "长期实时更新",
    icon: CalendarSync,
    badge: "正式版",
    description: "接入 Supabase 后，家长登录即可更新日程，iOS 订阅日历同步刷新。",
    details: ["家长账号登录", "云端保存", "多人协作", "Apple 日历订阅"]
  }
];

export function ParentHandoffPlan() {
  return (
    <Card className="border-border bg-card shadow-none">
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LockKeyhole className="h-4 w-4 text-primary" />
              编辑、分享与长期使用路径
            </CardTitle>
            <CardDescription>
              先保证今天能编辑和交付，再升级为家长长期使用的私有在线系统。
            </CardDescription>
          </div>
          <Badge variant="warning">私有定制版</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-3">
        {handoffSteps.map((step) => (
          <div key={step.title} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/60 text-foreground">
                  <step.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{step.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
              <Badge variant={step.badge === "当前可用" ? "success" : "outline"}>{step.badge}</Badge>
            </div>
            <div className="mt-4 grid gap-2">
              {step.details.map((detail) => (
                <div key={detail} className="rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  {detail}
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
