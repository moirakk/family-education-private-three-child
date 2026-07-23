"use client";

import { ChangeEvent, Dispatch, FormEvent, SetStateAction, useRef } from "react";
import { Camera, FileUp, ImagePlus, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getChildTheme } from "@/lib/child-theme";
import type { Child } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatFileSize, kindOptions, quickSubjects, quickTags, splitTags, type MaterialFormState } from "./shared";

export function MaterialUploadForm({
  childProfiles,
  childById,
  form,
  setForm,
  file,
  status,
  editingMaterialId,
  showAdvanced,
  setShowAdvanced,
  onSubmit,
  onFileChange,
  onToggleTag,
  onCancelEdit
}: {
  childProfiles: Child[];
  childById: Map<string, string>;
  form: MaterialFormState;
  setForm: Dispatch<SetStateAction<MaterialFormState>>;
  file: File | null;
  status: string;
  editingMaterialId: string | null;
  showAdvanced: boolean;
  setShowAdvanced: Dispatch<SetStateAction<boolean>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onToggleTag: (tag: string) => void;
  onCancelEdit: () => void;
}) {
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <form onSubmit={onSubmit} className="rounded-3xl border border-border bg-card p-3 shadow-sm shadow-black/[0.02] sm:p-4">
      <div className="grid gap-4">
        {editingMaterialId && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-primary/10 px-3 py-2 text-sm text-primary">
            正在编辑资料索引
            <button
              type="button"
              onClick={onCancelEdit}
              className="inline-flex items-center gap-1 text-xs font-medium"
            >
              <X className="h-3.5 w-3.5" />
              取消
            </button>
          </div>
        )}

        <div className="rounded-2xl bg-muted/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">手机资料沉淀</p>
          <p className="mt-1 text-sm font-medium text-foreground">
            优先拍照保存错题、讲义和试卷；标题与科目补齐后就能入库。
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>1. 归档到谁</Label>
            <span className="text-xs text-muted-foreground">{form.childId === "family" ? "全家资料" : childById.get(form.childId)}</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setForm((current) => ({ ...current, childId: "family" }))}
              className={cn(
                "rounded-2xl border px-2 py-3 text-center text-xs font-semibold transition",
                form.childId === "family" ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground"
              )}
            >
              全家
            </button>
            {childProfiles.map((child) => {
              const theme = getChildTheme(child);
              const active = form.childId === child.id;
              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, childId: child.id }))}
                  className={cn(
                    "rounded-2xl border px-2 py-3 text-center text-xs font-semibold transition",
                    active ? "bg-card text-foreground shadow-sm" : "border-border bg-card text-muted-foreground"
                  )}
                  style={active ? { borderColor: theme.hex, ...theme.surfaceStyle } : undefined}
                >
                  <span className="mx-auto mb-1 block h-2 w-2 rounded-full" style={theme.dotStyle} />
                  {child.firstName}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label>2. 资料类型</Label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {kindOptions.map((kind) => (
              <button
                key={kind.value}
                type="button"
                onClick={() => setForm((current) => ({ ...current, kind: kind.value }))}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition",
                  form.kind === kind.value ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground"
                )}
              >
                {kind.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>3. 添加资料</Label>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFileChange}
            disabled={Boolean(editingMaterialId)}
            className="hidden"
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            onChange={onFileChange}
            disabled={Boolean(editingMaterialId)}
            className="hidden"
          />
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
            onChange={onFileChange}
            disabled={Boolean(editingMaterialId)}
            className="hidden"
          />
          <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-2">
            <button
              type="button"
              disabled={Boolean(editingMaterialId)}
              onClick={() => cameraInputRef.current?.click()}
              className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-2 py-3 text-xs font-semibold text-primary shadow-sm shadow-primary/5 disabled:opacity-50"
            >
              <Camera className="h-6 w-6" />
              拍照
            </button>
            <button
              type="button"
              disabled={Boolean(editingMaterialId)}
              onClick={() => galleryInputRef.current?.click()}
              className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-amber-100 bg-amber-50 px-2 py-3 text-xs font-semibold text-amber-700 disabled:opacity-50"
            >
              <ImagePlus className="h-5 w-5" />
              相册
            </button>
            <button
              type="button"
              disabled={Boolean(editingMaterialId)}
              onClick={() => fileInputRef.current?.click()}
              className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-muted/60 px-2 py-3 text-xs font-semibold text-foreground disabled:opacity-50"
            >
              <FileUp className="h-5 w-5" />
              文件
            </button>
          </div>
          {file && (
            <p className="rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              已选择：{file.name} · {formatFileSize(file.size)}
            </p>
          )}
          {editingMaterialId && <p className="text-xs leading-5 text-muted-foreground">编辑模式暂不替换文件；需要换文件时请删除后重新上传。</p>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="material-title">标题</Label>
            <Input
              id="material-title"
              placeholder="例如：暑假数学讲义"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="material-subject">科目</Label>
            <Input
              id="material-subject"
              placeholder="数学 / 英语 / 阅读"
              value={form.subject}
              onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickSubjects.map((subject) => (
            <button
              key={subject}
              type="button"
              onClick={() => setForm((current) => ({ ...current, subject }))}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                form.subject === subject ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
              )}
            >
              {subject}
            </button>
            ))}
        </div>

        <button
          type="button"
          className="w-fit text-sm font-medium text-primary"
          onClick={() => setShowAdvanced((current) => !current)}
        >
          {showAdvanced ? "收起更多设置" : "更多设置：链接、备注、标签"}
        </button>
        {(showAdvanced || form.kind === "link" || form.kind === "video") && (
          <div className="grid gap-3 rounded-2xl border border-border bg-muted/60 p-3">
            <div className="space-y-1.5">
              <Label htmlFor="material-url">外部链接</Label>
              <Input
                id="material-url"
                placeholder="可选：网盘、学校链接、视频地址"
                value={form.externalUrl}
                className="bg-card"
                onChange={(event) => setForm((current) => ({ ...current, externalUrl: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="material-notes">备注</Label>
              <Textarea
                id="material-notes"
                placeholder="用途、使用建议、对应考试或阶段"
                value={form.notes}
                className="bg-card"
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="material-tags">标签</Label>
              <div className="mb-2 flex flex-wrap gap-2">
                {quickTags.map((tag) => {
                  const active = splitTags(form.tags).includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => onToggleTag(tag)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                        active ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
                      )}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
              <Input
                id="material-tags"
                placeholder="错题 讲义 暑假"
                value={form.tags}
                className="bg-card"
                onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
              />
            </div>
          </div>
        )}
        <Button type="submit" className="h-11 rounded-xl" disabled={!form.title.trim() || !form.subject.trim()}>
          <UploadCloud className="mr-2 h-4 w-4" />
          {editingMaterialId ? "保存资料修改" : "保存资料"}
        </Button>
        {status && <p className="text-xs text-muted-foreground">{status}</p>}
      </div>
    </form>
  );
}
