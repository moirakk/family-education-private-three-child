"use client";

import { Camera, LibraryBig, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Child } from "@/lib/types";
import { MaterialChildFilter } from "./materials-vault/material-child-filter";
import { MaterialGrid } from "./materials-vault/material-grid";
import { MaterialUploadForm } from "./materials-vault/material-upload-form";
import { useLearningMaterials } from "./materials-vault/use-learning-materials";

export function LearningMaterialsVault({
  childProfiles,
  openUploadRequest = 0
}: {
  childProfiles: Child[];
  openUploadRequest?: number;
}) {
  const vault = useLearningMaterials(childProfiles, openUploadRequest);

  return (
    <Card id="materials" className="relative overflow-hidden border-border bg-card shadow-none">
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LibraryBig className="h-4 w-4 text-primary" />
              学习资料库
            </CardTitle>
            <CardDescription>像相册一样沉淀试卷、讲义、错题照片和阅读材料；默认按时间倒序查看。</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="w-fit rounded-full bg-card">{vault.materials.length} 份资料</Badge>
            <Button
              type="button"
              className="hidden h-9 rounded-full sm:inline-flex"
              onClick={() => {
                vault.setEditingMaterialId(null);
                vault.setShowUploadPanel((current) => !current);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              上传资料
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <MaterialChildFilter
          childProfiles={childProfiles}
          activeChildFilter={vault.activeChildFilter}
          onFilterChange={vault.setActiveChildFilter}
        />

        {(vault.showUploadPanel || vault.editingMaterialId) && (
          <MaterialUploadForm
            childProfiles={childProfiles}
            childById={vault.childById}
            form={vault.form}
            setForm={vault.setForm}
            file={vault.file}
            status={vault.status}
            editingMaterialId={vault.editingMaterialId}
            showAdvanced={vault.showAdvanced}
            setShowAdvanced={vault.setShowAdvanced}
            onSubmit={vault.saveMaterial}
            onFileChange={vault.handleFileChange}
            onToggleTag={vault.toggleTag}
            onCancelEdit={() => {
              vault.resetForm();
              vault.setShowUploadPanel(false);
            }}
          />
        )}

        <MaterialGrid
          filteredMaterials={vault.filteredMaterials}
          childProfiles={childProfiles}
          childById={vault.childById}
          thumbnailUrls={vault.thumbnailUrls}
          onOpen={vault.downloadMaterial}
          onEdit={vault.editMaterial}
          onDelete={vault.deleteMaterial}
        />
        <Button
          type="button"
          className="fixed bottom-24 right-5 z-30 h-14 w-14 rounded-full shadow-lg shadow-primary/25 sm:hidden"
          onClick={() => {
            vault.setEditingMaterialId(null);
            vault.setShowUploadPanel(true);
            setTimeout(() => document.getElementById("materials")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
          }}
          aria-label="上传资料"
        >
          <Camera className="h-5 w-5" />
        </Button>
      </CardContent>
    </Card>
  );
}
