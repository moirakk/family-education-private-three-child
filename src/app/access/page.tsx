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
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm shadow-primary/20">
            <BookOpen className="h-5 w-5" />
          </div>
          <CardTitle className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <LockKeyhole className="h-4 w-4 text-primary" />
            Family Education
          </CardTitle>
          <CardDescription>
            输入访问码。家长进入管理页，家教老师进入反馈页。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/api/access" method="post" className="grid gap-4">
            <input type="hidden" name="next" value={next} />
            <div className="space-y-2">
              <Label htmlFor="code">访问码</Label>
              <Input id="code" name="code" type="password" autoComplete="current-password" autoFocus />
              {errorMessage && <p className="text-xs text-destructive">{errorMessage}</p>}
            </div>
            <Button type="submit">进入</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
