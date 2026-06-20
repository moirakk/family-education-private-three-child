"use client";

import { FormEvent, useEffect, useState } from "react";
import { Cloud, LockKeyhole, LogOut, Mail, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getRepositoryMode, hasSupabaseBrowserConfig } from "@/lib/family-repository";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type AuthUser = {
  email?: string;
};

export function AuthStatusCard() {
  const [email, setEmail] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [message, setMessage] = useState("");
  const mode = getRepositoryMode();
  const hasSupabase = hasSupabaseBrowserConfig();

  useEffect(() => {
    if (!hasSupabase) return;

    const supabase = getSupabaseBrowserClient();
    void supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ? { email: data.user.email ?? undefined } : null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { email: session.user.email ?? undefined } : null);
    });

    return () => listener.subscription.unsubscribe();
  }, [hasSupabase]);

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasSupabase || !email.trim()) return;

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin
      }
    });

    setMessage(error ? error.message : "登录链接已发送，请检查邮箱。");
  }

  async function signOut() {
    if (!hasSupabase) return;
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <Card className="border-white/70 bg-white/85 shadow-sm backdrop-blur">
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LockKeyhole className="h-4 w-4 text-primary" />
              登录与数据保存模式
            </CardTitle>
            <CardDescription>
              今天可用本机模式，长期版接 Supabase 后再云端保存和多设备同步。
            </CardDescription>
          </div>
          <Badge variant={mode === "supabase" ? "success" : "outline"} className="gap-1">
            {mode === "supabase" ? <Cloud className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
            {mode === "supabase" ? "Supabase 云端模式" : "本机安全模式"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm font-semibold">当前状态</p>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
            <p>数据仓库：{mode === "supabase" ? "Supabase Repository" : "Local Repository"}</p>
            <p>登录状态：{user?.email ? `已登录 ${user.email}` : hasSupabase ? "未登录" : "未配置 Supabase，暂不需要登录"}</p>
            <p>后续切换：配置 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`NEXT_PUBLIC_PRIVATE_FAMILY_ID`。</p>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4">
          {!hasSupabase ? (
            <div>
              <p className="text-sm font-semibold">今天推荐模式</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                先使用本机模式和 JSON 备份完成家长沟通。Supabase 项目建好后，同一套 Repository 会切换到云端保存。
              </p>
            </div>
          ) : user ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold">已进入云端准备状态</p>
              <p className="text-sm text-muted-foreground">后续新增的家长编辑数据可以接入 Supabase Repository。</p>
              <Button variant="outline" onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                退出登录
              </Button>
            </div>
          ) : (
            <form onSubmit={sendMagicLink} className="grid gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="auth-email">家长邮箱</Label>
                <Input
                  id="auth-email"
                  type="email"
                  placeholder="parent@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <Button type="submit">
                <Mail className="mr-2 h-4 w-4" />
                发送登录链接
              </Button>
              {message && <p className="text-xs text-muted-foreground">{message}</p>}
            </form>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
