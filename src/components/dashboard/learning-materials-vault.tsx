"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Download, FileUp, ImagePlus, LibraryBig, Pencil, Plus, Trash2, UploadCloud, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getChildTheme } from "@/lib/child-theme";
import { deletePrivateApi, getPrivateApi, isPrivateApiMode, postPrivateApi, postPrivateFormData, putPrivateApi } from "@/lib/private-api-client";
import type { Child, LearningMaterial } from "@/lib/types";
import { cn } from "@/lib/utils";

type MaterialFormState = {
  childId: string;
  title: string;
  subject: string;
  kind: LearningMaterial["kind"];
  externalUrl: string;
  notes: string;
  tags: string;
};

const metadataStorageKey = "family-education-private-materials-v1";
const databaseName = "family-education-private-files";
const storeName = "learning-material-files";
const quickSubjects = ["数学", "英语", "语文", "阅读", "科学", "综合"];
const quickTags = ["错题", "讲义", "试卷", "暑假", "预习", "复习"];
const kindLabels: Record<LearningMaterial["kind"], string> = {
  file: "文件",
  worksheet: "练习",
  note: "笔记",
  link: "链接",
  book: "书籍",
  video: "视频"
};
const kindOptions: { value: LearningMaterial["kind"]; label: string }[] = [
  { value: "file", label: "文件" },
  { value: "worksheet", label: "练习" },
  { value: "note", label: "笔记" },
  { value: "link", label: "链接" },
  { value: "book", label: "书籍" },
  { value: "video", label: "视频" }
];

function nowIso() {
  return new Date().toISOString();
}

function formatFileSize(size?: number) {
  if (!size) return "未记录大小";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function formatMaterialDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function splitTags(value: string) {
  return value
    .split(/[,，\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function createInitialForm(childProfiles: Child[]): MaterialFormState {
  return {
    childId: childProfiles[0]?.id ?? "family",
    title: "",
    subject: "",
    kind: "file",
    externalUrl: "",
    notes: "",
    tags: ""
  };
}

function openFileDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(databaseName, 1);

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName)) {
        request.result.createObjectStore(storeName);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putLocalFile(blobId: string, file: File) {
  const database = await openFileDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(file, blobId);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

async function getLocalFile(blobId: string) {
  const database = await openFileDatabase();

  return new Promise<Blob | undefined>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).get(blobId);

    request.onsuccess = () => resolve(request.result as Blob | undefined);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

async function deleteLocalFile(blobId: string) {
  const database = await openFileDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).delete(blobId);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

async function compressImageFile(file: File) {
  if (!file.type.startsWith("image/")) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const maxSide = 1600;
    const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (ratio === 1) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * ratio);
    canvas.height = Math.round(bitmap.height * ratio);
    const context = canvas.getContext("2d");
    if (!context) return file;

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outputType, 0.82));
    if (!blob || blob.size >= file.size) return file;

    const extension = outputType === "image/png" ? "png" : "jpg";
    const fileName = file.name.replace(/\.[^/.]+$/, "") || "material";
    return new File([blob], `${fileName}-compressed.${extension}`, {
      type: outputType,
      lastModified: Date.now()
    });
  } catch {
    return file;
  }
}

export function LearningMaterialsVault({
  childProfiles,
  openUploadRequest = 0
}: {
  childProfiles: Child[];
  openUploadRequest?: number;
}) {
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);
  const [form, setForm] = useState<MaterialFormState>(() => createInitialForm(childProfiles));
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [activeChildFilter, setActiveChildFilter] = useState<"all" | "family" | string>("all");
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({});
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (openUploadRequest > 0) setShowUploadPanel(true);
  }, [openUploadRequest]);

  useEffect(() => {
    const raw = window.localStorage.getItem(metadataStorageKey);
    if (!raw) return;

    try {
      setMaterials(JSON.parse(raw) as LearningMaterial[]);
    } catch {
      setMaterials([]);
    }
  }, []);

  useEffect(() => {
    if (!isPrivateApiMode()) return;

    getPrivateApi<LearningMaterial[]>("/api/private/materials")
      .then((remoteMaterials) => {
        setMaterials((current) => {
          const localOnly = current.filter((material) => material.id.startsWith("local-"));
          return [...remoteMaterials, ...localOnly];
        });
      })
      .catch((error) => {
        setStatus(error instanceof Error ? `资料库读取数据库失败：${error.message}` : "资料库读取数据库失败。");
      });
  }, []);

  useEffect(() => {
    window.localStorage.setItem(metadataStorageKey, JSON.stringify(materials));
  }, [materials]);

  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];

    async function loadThumbnails() {
      const nextUrls: Record<string, string> = {};
      const imageMaterials = materials.filter((material) => material.mimeType?.startsWith("image/"));

      await Promise.all(
        imageMaterials.map(async (material) => {
          try {
            if (material.localBlobId) {
              const blob = await getLocalFile(material.localBlobId);
              if (!blob) return;
              const objectUrl = URL.createObjectURL(blob);
              objectUrls.push(objectUrl);
              nextUrls[material.id] = objectUrl;
              return;
            }

            if (isPrivateApiMode() && !material.id.startsWith("local-")) {
              const data = await getPrivateApi<{ url: string }>(`/api/private/materials?materialId=${encodeURIComponent(material.id)}`);
              nextUrls[material.id] = data.url;
            }
          } catch {
            // Thumbnail loading is a preview nicety; opening the material still uses the normal download path.
          }
        })
      );

      if (!cancelled) setThumbnailUrls(nextUrls);
    }

    loadThumbnails();

    return () => {
      cancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [materials]);

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
            <Badge variant="outline" className="w-fit rounded-full bg-card">{materials.length} 份资料</Badge>
            <Button
              type="button"
              className="hidden h-9 rounded-full sm:inline-flex"
              onClick={() => {
                setEditingMaterialId(null);
                setShowUploadPanel((current) => !current);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              上传资料
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveChildFilter("all")}
            className={cn(
              "shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition",
              activeChildFilter === "all" ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground"
            )}
          >
            全部资料
          </button>
          <button
            type="button"
            onClick={() => setActiveChildFilter("family")}
            className={cn(
              "shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition",
              activeChildFilter === "family" ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground"
            )}
          >
            全家
          </button>
          {childProfiles.map((child) => {
            const theme = getChildTheme(child);
            const active = activeChildFilter === child.id;
            return (
              <button
                key={child.id}
                type="button"
                onClick={() => setActiveChildFilter(child.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition",
                  active ? "bg-card text-foreground shadow-sm" : "border-border bg-card text-muted-foreground"
                )}
                style={active ? { borderColor: theme.hex, ...theme.surfaceStyle } : undefined}
              >
                <span className="h-2 w-2 rounded-full" style={theme.dotStyle} />
                {child.firstName}
              </button>
            );
          })}
        </div>

        {(showUploadPanel || editingMaterialId) && (
        <form onSubmit={saveMaterial} className="rounded-3xl border border-border bg-card p-3 shadow-sm shadow-black/[0.02] sm:p-4">
          <div className="grid gap-4">
            {editingMaterialId && (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-primary/10 px-3 py-2 text-sm text-primary">
                正在编辑资料索引
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowUploadPanel(false);
                  }}
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
                onChange={handleFileChange}
                disabled={Boolean(editingMaterialId)}
                className="hidden"
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={Boolean(editingMaterialId)}
                className="hidden"
              />
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                onChange={handleFileChange}
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
                          onClick={() => toggleTag(tag)}
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
        )}

        <div className="rounded-3xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">资料相册</p>
              <p className="mt-1 text-xs text-muted-foreground">按时间倒序排列，先筛孩子，再打开或编辑资料。</p>
            </div>
            <Badge variant="secondary" className="rounded-full">{filteredMaterials.length} 项</Badge>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {filteredMaterials.map((material) => {
              const child = childProfiles.find((item) => item.id === material.childId);
              const theme = getChildTheme(child);
              return (
              <div key={material.id} className="group overflow-hidden rounded-3xl border border-border bg-muted/50 shadow-sm shadow-black/[0.02]">
                <button
                  type="button"
                  onClick={() => downloadMaterial(material)}
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
                    {thumbnailUrls[material.id] ? (
                      <div
                        aria-hidden="true"
                        className="h-full w-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${thumbnailUrls[material.id]})` }}
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
                        {material.childId ? childById.get(material.childId) : "全家"}
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
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => downloadMaterial(material)} aria-label="打开资料">
                      <Download className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => editMaterial(material)} aria-label="编辑资料">
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMaterial(material)} aria-label="删除资料">
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </div>
              );
            })}
            {filteredMaterials.length === 0 && (
              <p className="rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground sm:col-span-3 xl:col-span-4">
                还没有资料。今天可以先放一份试卷或讲义，让家长看到资料沉淀方式。
              </p>
            )}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">私有在线版会把文件上传到 Supabase Storage；本地模式会保存在当前浏览器。</p>
        </div>
        <Button
          type="button"
          className="fixed bottom-24 right-5 z-30 h-14 w-14 rounded-full shadow-lg shadow-primary/25 sm:hidden"
          onClick={() => {
            setEditingMaterialId(null);
            setShowUploadPanel(true);
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
