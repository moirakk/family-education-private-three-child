"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { compressImageFile } from "@/lib/compress-image";
import { nowIso } from "@/lib/date-utils";
import { deleteLocalFile, getLocalFile, putLocalFile } from "@/lib/local-file-store";
import { deletePrivateApi, getPrivateApi, isPrivateApiMode, postPrivateApi, postPrivateFormData, putPrivateApi } from "@/lib/private-api-client";
import type { Child, LearningMaterial } from "@/lib/types";
import { createInitialForm, formatFileSize, splitTags, type MaterialFormState } from "./shared";
import { useMaterialsPersistence, useMaterialThumbnails } from "./use-material-storage";

export type ChildFilter = "all" | "family" | string;

export function useLearningMaterials(childProfiles: Child[], openUploadRequest: number) {
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);
  const [form, setForm] = useState<MaterialFormState>(() => createInitialForm(childProfiles));
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [activeChildFilter, setActiveChildFilter] = useState<ChildFilter>("all");

  useMaterialsPersistence(materials, setMaterials, setStatus);
  const thumbnailUrls = useMaterialThumbnails(materials);

  useEffect(() => {
    if (openUploadRequest > 0) setShowUploadPanel(true);
  }, [openUploadRequest]);

  const childById = useMemo(() => new Map(childProfiles.map((child) => [child.id, child.firstName])), [childProfiles]);
  const filteredMaterials = useMemo(() => {
    return materials
      .filter((material) => {
        if (activeChildFilter === "all") return true;
        if (activeChildFilter === "family") return !material.childId;
        return material.childId === activeChildFilter;
      })
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [activeChildFilter, materials]);

  function resetForm(formElement?: HTMLFormElement | null) {
    setForm(createInitialForm(childProfiles));
    setFile(null);
    setEditingMaterialId(null);
    setShowAdvanced(false);
    formElement?.reset();
  }

  function editMaterial(material: LearningMaterial) {
    setEditingMaterialId(material.id);
    setFile(null);
    setForm({
      childId: material.childId ?? "family",
      title: material.title,
      subject: material.subject,
      kind: material.kind,
      externalUrl: material.externalUrl ?? "",
      notes: material.notes ?? "",
      tags: material.tags.join(" ")
    });
    setStatus("正在编辑资料索引；如需替换文件，请先删除后重新上传。");
    setShowAdvanced(true);
    setShowUploadPanel(true);
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    const nextFile = selectedFile ? await compressImageFile(selectedFile) : null;
    setFile(nextFile);

    if (nextFile) {
      setForm((current) => ({
        ...current,
        title: current.title || nextFile.name.replace(/\.[^/.]+$/, ""),
        subject: current.subject || "未分类",
        kind: "file"
      }));
      if (selectedFile && nextFile.size < selectedFile.size) {
        setStatus(`已压缩图片：${formatFileSize(selectedFile.size)} → ${formatFileSize(nextFile.size)}。`);
      }
    }
  }

  function toggleTag(tag: string) {
    setForm((current) => {
      const tags = splitTags(current.tags);
      const nextTags = tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag];
      return {
        ...current,
        tags: nextTags.join(" ")
      };
    });
  }

  async function saveMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || !form.subject.trim()) return;

    if (!editingMaterialId && form.kind === "file" && !file && !form.externalUrl.trim()) {
      setStatus("请上传文件，或填写外部链接。");
      return;
    }

    if (editingMaterialId) {
      const previousMaterials = materials;
      const currentMaterial = materials.find((material) => material.id === editingMaterialId);
      if (!currentMaterial) return;

      const updatedMaterial: LearningMaterial = {
        ...currentMaterial,
        childId: form.childId === "family" ? undefined : form.childId,
        title: form.title.trim(),
        subject: form.subject.trim(),
        kind: form.kind,
        externalUrl: form.externalUrl.trim() || undefined,
        notes: form.notes.trim() || undefined,
        tags: splitTags(form.tags),
        updatedAt: nowIso()
      };

      setMaterials((current) => current.map((material) => (material.id === editingMaterialId ? updatedMaterial : material)));
      resetForm(event.currentTarget);

      if (isPrivateApiMode() && !editingMaterialId.startsWith("local-")) {
        try {
          setStatus("正在同步资料修改...");
          const data = await putPrivateApi<LearningMaterial>(
            `/api/private/materials?materialId=${encodeURIComponent(editingMaterialId)}`,
            updatedMaterial
          );
          setMaterials((current) =>
            current.map((material) =>
              material.id === editingMaterialId
                ? {
                    ...data,
                    localBlobId: material.localBlobId
                  }
                : material
            )
          );
          setStatus("资料修改已同步到数据库。");
        } catch (error) {
          setMaterials(previousMaterials);
          setStatus(error instanceof Error ? `资料修改失败，已恢复：${error.message}` : "资料修改失败，已恢复。");
        }
      }
      return;
    }

    const id = `local-material-${Date.now()}`;
    const localBlobId = file ? `${id}-${file.name}` : undefined;
    let localSaved = false;

    try {
      if (file && localBlobId) {
        await putLocalFile(localBlobId, file);
      }

      const timestamp = nowIso();
      const nextMaterial: LearningMaterial = {
        id,
        childId: form.childId === "family" ? undefined : form.childId,
        title: form.title.trim(),
        subject: form.subject.trim(),
        kind: form.kind,
        fileName: file?.name,
        fileSize: file?.size,
        mimeType: file?.type,
        localBlobId,
        externalUrl: form.externalUrl.trim() || undefined,
        notes: form.notes.trim() || undefined,
        tags: splitTags(form.tags),
        createdAt: timestamp,
        updatedAt: timestamp
      };

      setMaterials((current) => [nextMaterial, ...current]);
      setStatus("已保存资料。");
      resetForm(event.currentTarget);
      setShowUploadPanel(false);
      localSaved = true;

      if (!isPrivateApiMode()) return;

      setStatus(file ? "本机已保存，正在上传文件到私有 Storage..." : "本机已保存，正在同步资料索引到数据库...");
      let data: LearningMaterial;

      if (file) {
        const uploadPayload = new FormData();
        uploadPayload.set("file", file);
        uploadPayload.set("title", nextMaterial.title);
        uploadPayload.set("subject", nextMaterial.subject);
        uploadPayload.set("kind", nextMaterial.kind);
        uploadPayload.set("childId", nextMaterial.childId ?? "");
        uploadPayload.set("externalUrl", nextMaterial.externalUrl ?? "");
        uploadPayload.set("notes", nextMaterial.notes ?? "");
        uploadPayload.set("tags", nextMaterial.tags.join(","));
        data = await postPrivateFormData<LearningMaterial>("/api/private/materials", uploadPayload);
      } else {
        data = await postPrivateApi<LearningMaterial>("/api/private/materials", nextMaterial);
      }

      setMaterials((current) =>
        current.map((material) =>
          material.id === nextMaterial.id
            ? {
                id: data.id,
                childId: data.childId,
                title: data.title,
                subject: data.subject,
                kind: data.kind,
                fileName: data.fileName,
                fileSize: data.fileSize,
                mimeType: data.mimeType,
                localBlobId: material.localBlobId,
                storagePath: data.storagePath,
                externalUrl: data.externalUrl,
                notes: data.notes,
                tags: data.tags,
                createdAt: data.createdAt,
                updatedAt: data.updatedAt
              }
            : material
        )
      );
      setStatus(file ? "文件已上传到私有 Storage，并已写入数据库。" : "资料索引已同步到数据库。");
    } catch {
      setStatus(localSaved && isPrivateApiMode() ? "本机已保存，数据库同步失败。请检查 Supabase 配置。" : "文件保存失败，请换一个文件重试。");
    }
  }

  async function downloadMaterial(material: LearningMaterial) {
    if (isPrivateApiMode() && !material.id.startsWith("local-")) {
      const data = await getPrivateApi<{ url: string }>(`/api/private/materials?materialId=${encodeURIComponent(material.id)}`);
      window.open(data.url, "_blank", "noopener,noreferrer");
      return;
    }

    if (material.externalUrl) {
      window.open(material.externalUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (!material.localBlobId) return;
    const blob = await getLocalFile(material.localBlobId);
    if (!blob) {
      setStatus("当前浏览器没有找到这个文件本体。");
      return;
    }

    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = material.fileName ?? material.title;
    link.click();
    URL.revokeObjectURL(objectUrl);
  }

  async function deleteMaterial(material: LearningMaterial) {
    if (material.localBlobId) {
      await deleteLocalFile(material.localBlobId);
    }
    setMaterials((current) => current.filter((item) => item.id !== material.id));
    if (isPrivateApiMode() && !material.id.startsWith("local-")) {
      await deletePrivateApi(`/api/private/materials?materialId=${encodeURIComponent(material.id)}`);
    }
  }

  return {
    materials,
    form,
    setForm,
    file,
    status,
    editingMaterialId,
    setEditingMaterialId,
    showAdvanced,
    setShowAdvanced,
    showUploadPanel,
    setShowUploadPanel,
    activeChildFilter,
    setActiveChildFilter,
    thumbnailUrls,
    childById,
    filteredMaterials,
    resetForm,
    editMaterial,
    handleFileChange,
    toggleTag,
    saveMaterial,
    downloadMaterial,
    deleteMaterial
  };
}
