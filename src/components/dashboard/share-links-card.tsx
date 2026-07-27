"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Copy, ExternalLink, Link2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useShareLinks, type ShareLinks } from "@/hooks/use-share-links";
import { postPrivateApi } from "@/lib/private-api-client";
import type { Child } from "@/lib/types";
import { cn } from "@/lib/utils";

const tutorSubjects = ["语文", "数学", "英语", "其他"] as const;

function createLocalLinks(): ShareLinks {
  if (typeof window === "undefined") {
    return { parentUrl: "", tutorFeedbackUrl: null };
  }

  return { parentUrl: `${window.location.origin}/`, tutorFeedbackUrl: null };
}

export function ShareLinksCard({ childProfiles }: { childProfiles: Child[] }) {
  const { shareLinks, shareLinksError } = useShareLinks();
  const [localLinks, setLocalLinks] = useState<ShareLinks>({ parentUrl: "", tutorFeedbackUrl: null });
  const [selectedChildId, setSelectedChildId] = useState(childProfiles[0]?.id ?? "");
  const [tutorName, setTutorName] = useState("");
  const [subject, setSubject] = useState<(typeof tutorSubjects)[number]>("数学");
  const [customSubject, setCustomSubject] = useState("");
  const [generatedTutorUrl, setGeneratedTutorUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState("");

  const links = shareLinks ?? localLinks;

  useEffect(() => {
    setLocalLinks(createLocalLinks());
  }, []);

  useEffect(() => {
    if (shareLinksError) {
      setStatus(`分享链接读取失败：${shareLinksError}`);
    }
  }, [shareLinksError]);

  useEffect(() => {
    if (!selectedChildId && childProfiles[0]?.id) setSelectedChildId(childProfiles[0].id);
  }, [childProfiles, selectedChildId]);

  function resetGeneratedLink() {
    setGeneratedTutorUrl(null);
    setStatus("");
  }

  async function copyLink(label: string, value: string | null) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setStatus(`${label}已复制。`);
  }

  async function generateTutorLink() {
    const finalSubject = subject === "其他" ? customSubject.trim() : subject;
    if (!selectedChildId || !tutorName.trim() || !finalSubject) {
      setStatus("请选择孩子，并填写老师姓名和科目。");
      return;
    }

    try {
      setIsGenerating(true);
      setStatus("正在生成专属链接...");
      const result = await postPrivateApi<{ tutorFeedbackUrl: string }>("/api/private/share-links", {
        childId: selectedChildId,
        tutorName: tutorName.trim(),
        subject: finalSubject
      });
      setGeneratedTutorUrl(result.tutorFeedbackUrl);
      setStatus("家教专属链接已生成，有效期一年。");
    } catch (error) {
      setStatus(error instanceof Error ? `生成失败：${error.message}` : "生成失败，请稍后重试。");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Card id="share-links">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              分享入口
            </CardTitle>
            <CardDescription>家长直接打开主入口；家教使用绑定孩子和科目的专属链接。</CardDescription>
          </div>
          <Badge variant="outline" className="w-fit gap-1 rounded-full bg-card">
            <ShieldCheck className="h-3.5 w-3.5" />
            私有分享
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/60 bg-white/60 p-3 shadow-sm shadow-black/[0.03] backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.05]">
          <p className="text-sm font-semibold text-foreground">家长手机入口</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">安装到主屏幕后直接点图标进入，不需要访问码。</p>
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

        <div className="rounded-2xl border border-white/60 bg-white/60 p-3 shadow-sm shadow-black/[0.03] backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.05]">
          <p className="text-sm font-semibold text-foreground">生成家教专属链接</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">每条链接只允许给指定孩子、指定科目提交反馈。</p>

          <div className="mt-3 grid gap-3">
            <div className="space-y-1.5">
              <Label>孩子</Label>
              <div className="grid grid-cols-3 gap-2">
                {childProfiles.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => {
                      setSelectedChildId(child.id);
                      resetGeneratedLink();
                    }}
                    className={cn(
                      "rounded-xl border px-2 py-2 text-sm font-medium transition",
                      selectedChildId === child.id ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/25 transition-colors duration-200" : "border-border bg-card text-muted-foreground transition-colors duration-200 hover:border-muted-foreground/40 hover:text-foreground"
                    )}
                  >
                    {child.firstName}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="share-tutor-name">老师姓名</Label>
              <Input
                id="share-tutor-name"
                value={tutorName}
                placeholder="例如：王老师"
                className="h-11 rounded-xl bg-card"
                onChange={(event) => {
                  setTutorName(event.target.value);
                  resetGeneratedLink();
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label>科目</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {tutorSubjects.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setSubject(option);
                      resetGeneratedLink();
                    }}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-xs font-medium transition",
                      subject === option ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/25 transition-colors duration-200" : "border-border bg-card text-muted-foreground transition-colors duration-200 hover:border-muted-foreground/40 hover:text-foreground"
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {subject === "其他" && (
                <Input
                  value={customSubject}
                  aria-label="自定义科目名称"
                  placeholder="输入科目名称"
                  className="h-11 rounded-xl bg-card"
                  onChange={(event) => {
                    setCustomSubject(event.target.value);
                    resetGeneratedLink();
                  }}
                />
              )}
            </div>

            <Button type="button" size="sm" className="h-10 rounded-xl" onClick={generateTutorLink} disabled={isGenerating}>
              {isGenerating ? "生成中..." : "生成专属链接"}
            </Button>
          </div>

          {generatedTutorUrl && (
            <div className="mt-3 rounded-xl bg-card p-3 ring-1 ring-border">
              <p className="break-all text-xs leading-5 text-muted-foreground">{generatedTutorUrl}</p>
              <Button size="sm" className="mt-3" onClick={() => copyLink("家教链接", generatedTutorUrl)}>
                <Copy className="mr-2 h-4 w-4" />
                复制给老师
              </Button>
            </div>
          )}
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
