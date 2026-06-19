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

  function saveChild() {
    if (!form.firstName.trim()) {
      return;
    }

    if (editingChild) {
      setChildren((current) =>
        current.map((child) =>
          child.id === editingChild.id
            ? {
                ...child,
                firstName: form.firstName,
                grade: form.grade,
                schoolName: form.schoolName,
                schoolProgram: form.schoolProgram,
                focusAreas: form.focusAreas.split(",").map((item) => item.trim()).filter(Boolean)
              }
            : child
        )
      );
      return;
    }

    const newChild: Child = {
      id: crypto.randomUUID(),
      firstName: form.firstName,
      lastName: "Tanaka",
      age: 0,
      grade: form.grade || "New student",
      schoolName: form.schoolName || "School pending",
      schoolProgram: form.schoolProgram || "Program pending",
      avatarColor: "#7c3aed",
      interests: [],
      focusAreas: form.focusAreas.split(",").map((item) => item.trim()).filter(Boolean)
    };
    setChildren((current) => [...current, newChild]);
    onSelectChild(newChild.id);
  }

  function deleteChild(childId: string) {
    setChildren((current) => current.filter((child) => child.id !== childId));
    if (selectedChildId === childId) {
      const fallback = childProfiles.find((child) => child.id !== childId);
      if (fallback) onSelectChild(fallback.id);
    }
  }

  return (
    <Card id="children" className="border-white/70 bg-white/85 shadow-sm backdrop-blur">
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
      <CardContent>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {childProfiles.map((child) => (
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
              className={`min-w-64 rounded-lg border bg-white p-4 text-left transition hover:border-primary/40 ${
                selectedChild?.id === child.id ? "border-primary ring-2 ring-primary/10" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback style={{ backgroundColor: child.avatarColor }}>{child.firstName.slice(0, 1)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{child.firstName} {child.lastName}</p>
                  <p className="text-xs text-muted-foreground">{child.grade}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1">
                {child.focusAreas.slice(0, 2).map((area) => (
                  <Badge key={area} variant="outline">
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
          ))}
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
