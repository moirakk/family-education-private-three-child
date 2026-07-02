"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Download, Home, Share, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || Boolean(navigatorWithStandalone.standalone);
}

export function PwaInstallCard() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsStandalone(isStandaloneDisplay());

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
    setIsStandalone(isStandaloneDisplay());
  }

  return (
    <Card className="border-border bg-card shadow-none">
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-primary" />
              手机桌面私有 App
            </CardTitle>
            <CardDescription>
              Family Education 按 PWA 设计：家长打开私有链接后，可以添加到手机主屏幕，像 App 一样日常使用。
            </CardDescription>
          </div>
          <Badge variant={isStandalone ? "success" : "outline"} className="gap-1">
            {isStandalone ? <CheckCircle2 className="h-3 w-3" /> : <Home className="h-3 w-3" />}
            {isStandalone ? "已从主屏幕打开" : "可添加到主屏幕"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-semibold">iPhone 家长使用方式</p>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <p className="flex gap-2 rounded-xl bg-muted/50 p-3"><span className="font-semibold text-foreground">1.</span> Safari 打开私有链接并输入访问码。</p>
            <p className="flex gap-2 rounded-xl bg-muted/50 p-3"><Share className="mt-0.5 h-4 w-4 text-muted-foreground" /> 点击分享按钮。</p>
            <p className="flex gap-2 rounded-xl bg-muted/50 p-3"><Home className="mt-0.5 h-4 w-4 text-muted-foreground" /> 选择“添加到主屏幕”。</p>
            <p className="flex gap-2 rounded-xl bg-muted/50 p-3"><span className="font-semibold text-foreground">4.</span> 之后从桌面图标进入。</p>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl bg-foreground p-4 text-background">
          <div>
            <p className="text-sm font-semibold">安装状态</p>
            <p className="mt-2 text-sm leading-6 text-background/70">
              {isStandalone ? "当前已经像 App 一样从主屏幕打开。" : "iPhone 使用分享菜单添加；Chrome/Android 可直接安装。"}
            </p>
          </div>
          <Button className="mt-4 w-full" variant="secondary" disabled={!installPrompt} onClick={installApp}>
            <Download className="mr-2 h-4 w-4" />
            {installPrompt ? "安装到设备" : "iPhone 请用分享菜单添加"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
