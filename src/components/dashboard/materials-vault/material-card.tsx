"use client";

import { Download, FileUp, ImagePlus, LibraryBig, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getChildTheme } from "@/lib/child-theme";
import type { Child, LearningMaterial } from "@/lib/types";
import { formatFileSize, formatMaterialDate, kindLabels } from "./shared";

export function MaterialCard({
  material,
  child,
  childName,
  thumbnailUrl,
  onOpen,
  onEdit,
  onDelete
}: {
  material: LearningMaterial;
  child?: Child;
  childName?: string;
  thumbnailUrl?: string;
  onOpen: (material: LearningMaterial) => void;
  onEdit: (material: LearningMaterial) => void;
  onDelete: (material: LearningMaterial) => void;
}) {
  const theme = getChildTheme(child);

  return (
    <div className="group overflow-hidden rounded-3xl border border-border bg-muted/50 shadow-sm shadow-black/[0.02]">
      <button
        type="button"
        onClick={() => onOpen(material)}
        className="block w-full text-left"
        aria-label={`打开${material.title}`}
      >
        <div
          className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-muted"
          style={material.childId ? theme.surfaceStyle : undefined}
        >
          <div className="absolute left-3 top-3 rounded-full bg-card/90 px-2 py-1 text-[11px] font-semibold text-foreground shadow-sm">
            {formatMaterialDate(material.createdAt)}
          </div>
          {thumbnailUrl ? (
            <div
              aria-hidden="true"
              className="h-full w-full bg-cover bg-center"
              style={{ backgroundImage: `url(${thumbnailUrl})` }}
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-card/90 shadow-sm ring-1 ring-border">
              {material.mimeType?.startsWith("image/") ? (
                <ImagePlus className="h-6 w-6 text-primary" />
            ) : material.kind === "link" || material.kind === "video" ? (
              <LibraryBig className="h-6 w-6 text-primary" />
            ) : (
              <FileUp className="h-6 w-6 text-muted-foreground" />
            )}
            </div>
          )}
        </div>
        <div className="space-y-2 p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="rounded-full bg-card text-[11px]">
              {material.childId ? childName : "全家"}
            </Badge>
            <Badge variant="secondary" className="rounded-full text-[11px]">{kindLabels[material.kind] ?? material.kind}</Badge>
          </div>
          <div>
            <p className="line-clamp-2 text-sm font-semibold leading-5">{material.title}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {material.subject} · {material.fileName ?? "链接/笔记"}
            </p>
          </div>
        </div>
      </button>
      <div className="flex items-center justify-between border-t border-border/70 px-2 py-1.5">
        <span className="truncate px-1 text-[11px] text-muted-foreground">{formatFileSize(material.fileSize)}</span>
        <div className="flex shrink-0 gap-1">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpen(material)} aria-label="打开资料">
            <Download className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(material)} aria-label="编辑资料">
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(material)} aria-label="删除资料">
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </div>
  );
}
