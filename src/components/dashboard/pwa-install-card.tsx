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

  if (isStandalone) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-primary" />
              添加到手机主屏幕
            </CardTitle>
            <CardDescription>
              添加到主屏幕后，像 App 一样直接打开。
            </CardDescription>
          </div>
          <Badge variant={isStandalone ? "success" : "outline"} className="gap-1">
            {isStandalone ? <CheckCircle2 className="h-3 w-3" /> : <Home className="h-3 w-3" />}
            {isStandalone ? "已从主屏幕打开" : "可添加到主屏幕"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="rounded-2xl border border-white/60 bg-white/60 p-4 shadow-sm shadow-black/[0.03] backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.05]">
          <p className="text-sm font-semibold">iPhone 添加步骤</p>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <p className="flex gap-2 rounded-xl bg-muted/50 p-3"><span className="font-semibold text-foreground">1.</span> Safari 打开私有链接并输入访问码。</p>
            <p className="flex gap-2 rounded-xl bg-muted/50 p-3"><Share className="mt-0.5 h-4 w-4 text-muted-foreground" /> 点击分享按钮。</p>
            <p className="flex gap-2 rounded-xl bg-muted/50 p-3"><Home className="mt-0.5 h-4 w-4 text-muted-foreground" /> 选择“添加到主屏幕”。</p>
            <p className="flex gap-2 rounded-xl bg-muted/50 p-3"><span className="font-semibold text-foreground">4.</span> 之后从桌面图标进入。</p>
          </div>
        </div>

        <Button className="w-full sm:w-auto sm:justify-self-start" variant="secondary" disabled={!installPrompt} onClick={installApp}>
          <Download className="mr-2 h-4 w-4" />
          {installPrompt ? "安装到设备" : "请按上方步骤添加"}
        </Button>
      </CardContent>
    </Card>
  );
}
