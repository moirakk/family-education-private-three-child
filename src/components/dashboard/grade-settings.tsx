"use client";

import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isPrivateApiMode, putPrivateApi } from "@/lib/private-api-client";
import type { Child } from "@/lib/types";

export function GradeSettings({
  childProfiles,
  setChildren
}: {
  childProfiles: Child[];
  setChildren: (children: Child[]) => void;
}) {
  const [grades, setGrades] = useState(() => Object.fromEntries(childProfiles.map((child) => [child.id, child.grade])));
  const [status, setStatus] = useState("");

  async function save() {
    const previous = childProfiles;
    const next = childProfiles.map((child) => ({ ...child, grade: grades[child.id]?.trim() || child.grade }));
    setChildren(next);
    setStatus("正在保存年级...");

    if (!isPrivateApiMode()) {
      setStatus("年级已保存到当前设备。");
      return;
    }

    try {
      const saved = await Promise.all(
        next.map((child) => putPrivateApi<Child>(`/api/private/children?childId=${encodeURIComponent(child.id)}`, child))
      );
      setChildren(saved);
      setStatus("三个孩子的年级已保存。");
    } catch (error) {
      setChildren(previous);
      setStatus(error instanceof Error ? `保存失败，已恢复：${error.message}` : "保存失败，已恢复。" );
    }
  }

  return (
    <Card id="grade-settings" className="border-border bg-card shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" />
          孩子年级
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {childProfiles.map((child) => (
            <div key={child.id} className="space-y-1.5">
              <Label htmlFor={`grade-${child.id}`}>{child.firstName}</Label>
              <Input
                id={`grade-${child.id}`}
                value={grades[child.id] ?? ""}
                placeholder="例如：初一"
                onChange={(event) => setGrades((current) => ({ ...current, [child.id]: event.target.value }))}
              />
            </div>
          ))}
        </div>
        <Button type="button" onClick={save}>保存年级</Button>
        {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}
      </CardContent>
    </Card>
  );
}
