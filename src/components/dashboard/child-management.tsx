"use client";

import { type Dispatch, type SetStateAction, useMemo, useState } from "react";
import { Edit3, Plus, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getChildTheme } from "@/lib/child-theme";
import { deletePrivateApi, isPrivateApiMode, postPrivateApi, putPrivateApi } from "@/lib/private-api-client";
import type { Child } from "@/lib/types";

type ChildFormState = {
  firstName: string;
  grade: string;
  schoolName: string;
  schoolProgram: string;
  focusAreas: string;
};

const emptyForm: ChildFormState = {
  firstName: "",
  grade: "",
  schoolName: "",
  schoolProgram: "",
  focusAreas: ""
};

export function ChildManagement({
  childProfiles,
  setChildren,
  selectedChildId,
  onSelectChild
}: {
  childProfiles: Child[];
  setChildren: Dispatch<SetStateAction<Child[]>>;
  selectedChildId: string;
  onSelectChild: (childId: string) => void;
}) {
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [form, setForm] = useState<ChildFormState>(emptyForm);
  const [syncStatus, setSyncStatus] = useState("");

  const selectedChild = useMemo(
    () => childProfiles.find((child) => child.id === selectedChildId) ?? childProfiles[0],
    [childProfiles, selectedChildId]
  );

  function openCreate() {
    setEditingChild(null);
    setForm(emptyForm);
  }

  function openEdit(child: Child) {
    setEditingChild(child);
    setForm({
      firstName: child.firstName,
      grade: child.grade,
      schoolName: child.schoolName,
      schoolProgram: child.schoolProgram,
      focusAreas: child.focusAreas.join(", ")
    });
  }

  function buildChildFromForm(id: string, base?: Child): Child {
    return {
      id,
      firstName: form.firstName.trim(),
      lastName: base?.lastName ?? "",
      age: base?.age ?? 0,
      grade: form.grade.trim() || "阶段待补充",
      schoolName: form.schoolName.trim() || "学校待补充",
      schoolProgram: form.schoolProgram.trim() || "课程组合待补充",
      avatarColor: base?.avatarColor ?? "#7c3aed",
      interests: base?.interests ?? [],
      focusAreas: form.focusAreas.split(/[,，]/).map((item) => item.trim()).filter(Boolean)
    };
  }

  async function saveChild() {
    if (!form.firstName.trim()) {
      return;
    }

    if (editingChild) {
      const previousChildren = childProfiles;
      const updatedChild = buildChildFromForm(editingChild.id, editingChild);
      setChildren((current) =>
        current.map((child) => (child.id === editingChild.id ? updatedChild : child))
      );

      if (isPrivateApiMode() && !editingChild.id.startsWith("local-")) {
        try {
          setSyncStatus("正在同步孩子档案修改...");
          const savedChild = await putPrivateApi<Child>(`/api/private/children?childId=${encodeURIComponent(editingChild.id)}`, updatedChild);
          setChildren((current) => current.map((child) => (child.id === editingChild.id ? savedChild : child)));
          setSyncStatus("孩子档案修改已同步到数据库。");
        } catch (error) {
          setChildren(previousChildren);
          setSyncStatus(error instanceof Error ? `孩子档案修改失败，已恢复：${error.message}` : "孩子档案修改失败，已恢复。");
        }
      }
      return;
    }

    const localId = `local-child-${crypto.randomUUID()}`;
    const newChild = buildChildFromForm(localId);
    setChildren((current) => [...current, newChild]);
    onSelectChild(newChild.id);

    if (isPrivateApiMode()) {
      try {
        setSyncStatus("正在同步新增孩子档案...");
        const savedChild = await postPrivateApi<Child>("/api/private/children", newChild);
        setChildren((current) => current.map((child) => (child.id === localId ? savedChild : child)));
        onSelectChild(savedChild.id);
        setSyncStatus("新增孩子档案已同步到数据库。");
      } catch (error) {
        setSyncStatus(error instanceof Error ? `本机已保存，数据库同步失败：${error.message}` : "本机已保存，数据库同步失败。");
      }
    }
  }

  async function deleteChild(childId: string) {
    const child = childProfiles.find((item) => item.id === childId);
    const confirmed = window.confirm(`确认删除${child?.firstName ? `「${child.firstName}」` : "这个孩子档案"}？只有空档案建议删除；已有记录的档案会被数据库保护。`);
    if (!confirmed) return;

    const previousChildren = childProfiles;
    setChildren((current) => current.filter((child) => child.id !== childId));
    if (selectedChildId === childId) {
      const fallback = childProfiles.find((child) => child.id !== childId);
      if (fallback) onSelectChild(fallback.id);
    }

    if (isPrivateApiMode() && !childId.startsWith("local-")) {
      try {
        setSyncStatus("正在从数据库删除孩子档案...");
        await deletePrivateApi(`/api/private/children?childId=${encodeURIComponent(childId)}`);
        setSyncStatus("孩子档案已从数据库删除。");
      } catch (error) {
        setChildren(previousChildren);
        setSyncStatus(error instanceof Error ? `删除失败，已恢复：${error.message}` : "删除失败，已恢复。");
      }
    }
  }

  return (
    <Card id="children" className="min-w-0 border-border bg-card shadow-none">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>孩子档案管理</CardTitle>
            <CardDescription>维护伯、仲、叔三人的学校、阶段和关注重点。</CardDescription>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                新增孩子
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingChild ? "编辑孩子档案" : "新增孩子档案"}</DialogTitle>
                <DialogDescription>这些信息未来会直接映射到 children 数据表。</DialogDescription>
              </DialogHeader>
              <ChildForm form={form} setForm={setForm} />
              <DialogClose asChild>
                <Button onClick={saveChild}>Save profile</Button>
              </DialogClose>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="min-w-0">
        {syncStatus && <p className="mb-3 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">{syncStatus}</p>}
        <div className="flex w-full max-w-full gap-3 overflow-x-auto pb-2">
          {childProfiles.map((child) => {
            const theme = getChildTheme(child);
            return (
              <div
                role="button"
                tabIndex={0}
                key={child.id}
                onClick={() => onSelectChild(child.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    onSelectChild(child.id);
                  }
                }}
                className={`min-w-64 rounded-2xl border bg-card p-4 text-left transition hover:border-primary/40 ${
                  selectedChild?.id === child.id ? "border-primary ring-2 ring-primary/10" : "border-border"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback style={{ ...theme.avatarBgStyle, ...theme.avatarTextStyle }}>{child.firstName.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{child.firstName} {child.lastName}</p>
                    <p className="text-xs text-muted-foreground">{child.grade}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1">
                  {child.focusAreas.slice(0, 2).map((area) => (
                    <Badge key={area} variant="outline" className="rounded-full">
                      {area}
                    </Badge>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(event) => {
                          event.stopPropagation();
                          openEdit(child);
                        }}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        编辑
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>编辑孩子档案</DialogTitle>
                        <DialogDescription>更新学校、课程和阶段重点。</DialogDescription>
                      </DialogHeader>
                      <ChildForm form={form} setForm={setForm} />
                      <DialogClose asChild>
                        <Button onClick={saveChild}>Save profile</Button>
                      </DialogClose>
                    </DialogContent>
                  </Dialog>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteChild(child.id);
                    }}
                    disabled={childProfiles.length === 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    删除
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function ChildForm({
  form,
  setForm
}: {
  form: ChildFormState;
  setForm: Dispatch<SetStateAction<ChildFormState>>;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="firstName">显示名称</Label>
        <Input id="firstName" value={form.firstName} onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="grade">阶段 / 年级</Label>
          <Input id="grade" value={form.grade} onChange={(event) => setForm((current) => ({ ...current, grade: event.target.value }))} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="program">课程组合</Label>
          <Input id="program" value={form.schoolProgram} onChange={(event) => setForm((current) => ({ ...current, schoolProgram: event.target.value }))} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="school">学校</Label>
        <Input id="school" value={form.schoolName} onChange={(event) => setForm((current) => ({ ...current, schoolName: event.target.value }))} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="focus">关注重点</Label>
        <Textarea
          id="focus"
          value={form.focusAreas}
          onChange={(event) => setForm((current) => ({ ...current, focusAreas: event.target.value }))}
          placeholder="Algebra fluency, reading stamina"
        />
      </div>
    </div>
  );
}
