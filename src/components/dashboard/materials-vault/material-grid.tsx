"use client";

import { Badge } from "@/components/ui/badge";
import type { Child, LearningMaterial } from "@/lib/types";
import { MaterialCard } from "./material-card";

export function MaterialGrid({
  filteredMaterials,
  childProfiles,
  childById,
  thumbnailUrls,
  onOpen,
  onEdit,
  onDelete
}: {
  filteredMaterials: LearningMaterial[];
  childProfiles: Child[];
  childById: Map<string, string>;
  thumbnailUrls: Record<string, string>;
  onOpen: (material: LearningMaterial) => void;
  onEdit: (material: LearningMaterial) => void;
  onDelete: (material: LearningMaterial) => void;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">资料相册</p>
          <p className="mt-1 text-xs text-muted-foreground">按时间倒序排列，先筛孩子，再打开或编辑资料。</p>
        </div>
        <Badge variant="secondary" className="rounded-full">{filteredMaterials.length} 项</Badge>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {filteredMaterials.map((material) => (
          <MaterialCard
            key={material.id}
            material={material}
            child={childProfiles.find((item) => item.id === material.childId)}
            childName={material.childId ? childById.get(material.childId) : undefined}
            thumbnailUrl={thumbnailUrls[material.id]}
            onOpen={onOpen}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
        {filteredMaterials.length === 0 && (
          <p className="rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground sm:col-span-3 xl:col-span-4">
            还没有资料。今天可以先放一份试卷或讲义，让家长看到资料沉淀方式。
          </p>
        )}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">私有在线版会把文件上传到 Supabase Storage；本地模式会保存在当前浏览器。</p>
    </div>
  );
}
