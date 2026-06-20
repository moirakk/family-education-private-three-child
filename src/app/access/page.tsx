import { BookOpen, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function AccessPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string; code?: string }>;
}) {
  const params = await searchParams;
  const next = params.next ?? "/";
  const hasWrongCode = Boolean(params.code);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-md border-white/70 bg-white/90 shadow-sm backdrop-blur">
        <CardHeader>
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookOpen className="h-5 w-5" />
          </div>
          <CardTitle className="flex items-center gap-2">
            <LockKeyhole className="h-4 w-4 text-primary" />
            Family Education 私有访问
          </CardTitle>
          <CardDescription>
            请输入访问码。这个入口用于私有部署时给家长安全查看和编辑。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/access" method="get" className="grid gap-4">
            <input type="hidden" name="next" value={next} />
            <div className="space-y-1.5">
              <Label htmlFor="code">访问码</Label>
              <Input id="code" name="code" type="password" autoComplete="current-password" autoFocus />
              {hasWrongCode && <p className="text-xs text-destructive">访问码不正确，请重新输入。</p>}
            </div>
            <Button type="submit">进入私有工作台</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
