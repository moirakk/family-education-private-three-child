"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Copy, ExternalLink, Link2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPrivateApi, isPrivateApiMode } from "@/lib/private-api-client";

type ShareLinks = {
  parentUrl: string;
  tutorFeedbackUrl: string | null;
};

function createLocalLinks(): ShareLinks {
  if (typeof window === "undefined") {
    return {
      parentUrl: "",
      tutorFeedbackUrl: null
    };
  }

  return {
    parentUrl: `${window.location.origin}/`,
    tutorFeedbackUrl: null
  };
}

export function ShareLinksCard() {
  const [links, setLinks] = useState<ShareLinks>(() => createLocalLinks());
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!isPrivateApiMode()) {
      setLinks(createLocalLinks());
      return;
    }

    getPrivateApi<ShareLinks>("/api/private/share-links")
      .then(setLinks)
      .catch((error) => {
        setLinks(createLocalLinks());
        setStatus(error instanceof Error ? `分享链接读取失败：${error.message}` : "分享链接读取失败。");
      });
  }, []);

  async function copyLink(label: string, value: string | null) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setStatus(`${label}已复制。`);
  }

  return (
    <Card id="share-links" className="border-border bg-card shadow-none">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              分享入口
            </CardTitle>
            <CardDescription>家长直接打开主入口；家教老师只拿课后反馈链接。</CardDescription>
          </div>
          <Badge variant="outline" className="w-fit gap-1 rounded-full bg-card">
            <ShieldCheck className="h-3.5 w-3.5" />
            私有分享
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-muted/40 p-3">
          <p className="text-sm font-semibold text-foreground">家长手机入口</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">安装到主屏幕后，家长以后直接点图标进入，不需要访问码。</p>
          <p className="mt-3 break-all rounded-xl bg-card px-3 py-2 text-xs text-muted-foreground ring-1 ring-border">{links.parentUrl || "正在生成链接..."}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => copyLink("家长链接", links.parentUrl)} disabled={!links.parentUrl}>
              <Copy className="mr-2 h-4 w-4" />
              复制家长链接
            </Button>
            {links.parentUrl && (
              <Button size="sm" variant="outline" asChild>
                <a href={links.parentUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  打开
                </a>
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-muted/40 p-3">
          <p className="text-sm font-semibold text-foreground">家教反馈入口</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">这个链接只进入课后反馈页，不开放完整家庭页面。</p>
          <p className="mt-3 break-all rounded-xl bg-card px-3 py-2 text-xs text-muted-foreground ring-1 ring-border">
            {links.tutorFeedbackUrl || "家教链接未配置"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => copyLink("家教链接", links.tutorFeedbackUrl)} disabled={!links.tutorFeedbackUrl}>
              <Copy className="mr-2 h-4 w-4" />
              复制家教链接
            </Button>
            {links.tutorFeedbackUrl && (
              <Button size="sm" variant="outline" asChild>
                <a href={links.tutorFeedbackUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  打开
                </a>
              </Button>
            )}
          </div>
        </div>

        {status && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground lg:col-span-2">
            {status.endsWith("已复制。") && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            {status}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
