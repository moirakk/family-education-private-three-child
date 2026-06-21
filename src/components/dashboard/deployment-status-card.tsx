"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, DatabaseZap, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type HealthResponse = {
  ok: boolean;
  readyForPrivateDeploy: boolean;
  checks: {
    app: boolean;
    supabaseUrl: boolean;
    supabaseAnonKey: boolean;
    supabaseServiceRole: boolean;
    privateFamilyId: boolean;
    privateParentAccessCode: boolean;
    privateCaregiverAccessCode: boolean;
    privateTutorAccessCode: boolean;
    privateViewerAccessCode: boolean;
    calendarTokenSource: string;
    learningMaterialsBucket: boolean;
    dataMode: string;
  };
};

const labels: Array<{ key: keyof HealthResponse["checks"]; label: string }> = [
  { key: "supabaseUrl", label: "Supabase URL" },
  { key: "supabaseAnonKey", label: "Anon Key" },
  { key: "supabaseServiceRole", label: "Service Role" },
  { key: "privateFamilyId", label: "Family ID" },
  { key: "privateParentAccessCode", label: "家长访问码" },
  { key: "learningMaterialsBucket", label: "Storage Bucket" }
];

export function DeploymentStatusCard() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadHealth() {
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/health");
      const payload = (await response.json()) as HealthResponse;
      if (!response.ok) throw new Error("Health check failed");
      setHealth(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Health check failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadHealth();
  }, []);

  const missingItems = useMemo(() => {
    if (!health) return [];
    return labels.filter((item) => !Boolean(health.checks[item.key]));
  }, [health]);

  return (
    <Card id="deploy-status" className="border-white/70 bg-white/85 shadow-sm backdrop-blur">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DatabaseZap className="h-4 w-4 text-primary" />
              长期部署状态
            </CardTitle>
            <CardDescription>检查数据库、家长访问码、iOS 日历 token 来源和资料 Storage 是否已准备好。</CardDescription>
          </div>
          <Badge variant={health?.readyForPrivateDeploy ? "success" : "warning"} className="gap-1">
            {health?.readyForPrivateDeploy ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
            {health?.readyForPrivateDeploy ? "可私有部署" : "待配置"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">环境变量检查</p>
              <p className="mt-1 text-xs text-muted-foreground">当前数据模式：{health?.checks.dataMode ?? "读取中"}</p>
              <p className="mt-1 text-xs text-muted-foreground">日历 token：{health?.checks.calendarTokenSource ?? "读取中"}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadHealth()} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              刷新
            </Button>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {labels.map((item) => {
              const ready = Boolean(health?.checks[item.key]);
              return (
                <div key={item.key} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
                  <span className="text-sm">{item.label}</span>
                  <Badge variant={ready ? "success" : "outline"}>{ready ? "已配置" : "缺少"}</Badge>
                </div>
              );
            })}
          </div>
          {health && (
            <p className="mt-3 text-xs text-muted-foreground">
              可选角色码：照护人 {health.checks.privateCaregiverAccessCode ? "已配置" : "未配置"}，
              家教 {health.checks.privateTutorAccessCode ? "已配置" : "未配置"}，
              只读 {health.checks.privateViewerAccessCode ? "已配置" : "未配置"}。
            </p>
          )}
          {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
        </div>

        <div className="rounded-lg bg-slate-950 p-4 text-white">
          <p className="text-sm font-semibold">下一步</p>
          {health?.readyForPrivateDeploy ? (
            <div className="mt-3 grid gap-2 text-sm text-slate-300">
              <p>1. 部署到 Vercel 私有项目。</p>
              <p>2. iPhone Safari 打开链接并添加到主屏幕。</p>
              <p>3. 在 Apple Calendar 订阅私有日历链接。</p>
            </div>
          ) : (
            <div className="mt-3 grid gap-2 text-sm text-slate-300">
              {missingItems.length > 0 ? (
                missingItems.map((item) => <p key={item.key}>缺少：{item.label}</p>)
              ) : (
                <p>正在读取配置状态。</p>
              )}
            </div>
          )}
          <p className="mt-4 text-xs leading-5 text-slate-400">详细步骤见 docs/private-supabase-vercel-runbook.md。</p>
        </div>
      </CardContent>
    </Card>
  );
}
