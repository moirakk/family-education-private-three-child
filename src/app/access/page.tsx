import { BookOpen, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function AccessPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = params.next ?? "/";
  const errorMessage =
    params.error === "locked"
      ? "尝试次数过多，请稍后再试。"
      : params.error
        ? "访问码不正确，请重新输入。"
        : "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 px-4 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/75 text-primary-foreground shadow-md shadow-primary/30">
            <BookOpen className="h-5 w-5" />
          </div>
          <CardTitle className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <LockKeyhole className="h-4 w-4 text-primary" />
            Family Education 私有访问
          </CardTitle>
          <CardDescription>
            家长/照护人进入完整工作台；家教访问码会进入课后反馈入口。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/api/access" method="post" className="grid gap-4">
            <input type="hidden" name="next" value={next} />
            <div className="space-y-1.5">
              <Label htmlFor="code">访问码</Label>
              <Input id="code" name="code" type="password" autoComplete="current-password" autoFocus />
              {errorMessage && <p className="text-xs text-destructive">{errorMessage}</p>}
            </div>
            <Button type="submit">进入私有工作台</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
