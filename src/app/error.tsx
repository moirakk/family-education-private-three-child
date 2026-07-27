"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-semibold text-blue-600">Family Education</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">页面暂时出错</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          数据还在数据库里，先刷新这一屏即可。若连续出现，请保留当前页面再联系维护。
        </p>
        <Button type="button" className="mt-5 h-11 rounded-xl px-6" onClick={reset}>
          重新加载
        </Button>
      </section>
    </main>
  );
}
