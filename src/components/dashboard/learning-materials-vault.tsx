"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Download, LibraryBig, Pencil, Trash2, UploadCloud, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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

function nowIso() {
  return new Date().toISOString();
}

function formatFileSize(size?: number) {
  if (!size) return "未记录大小";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
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

export function LearningMaterialsVault({ childProfiles }: { childProfiles: Child[] }) {
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);
  const [form, setForm] = useState<MaterialFormState>(() => createInitialForm(childProfiles));
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);

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

  const childById = useMemo(() => new Map(childProfiles.map((child) => [child.id, child.firstName])), [childProfiles]);

  function resetForm(formElement?: HTMLFormElement | null) {
    setForm(createInitialForm(childProfiles));
    setFile(null);
    setEditingMaterialId(null);
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
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);

    if (nextFile) {
      setForm((current) => ({
        ...current,
        title: current.title || nextFile.name.replace(/\.[^/.]+$/, ""),
        subject: current.subject || "未分类",
        kind: "file"
      }));
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
    <Card id="materials" className="overflow-hidden border-white/70 bg-white/85 shadow-sm shadow-slate-200/60 backdrop-blur">
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LibraryBig className="h-4 w-4 text-primary" />
              学习资料库
            </CardTitle>
            <CardDescription>保存试卷、讲义、错题照片、阅读材料和链接；后续可导出为本地资料索引。</CardDescription>
          </div>
          <Badge variant="outline" className="w-fit rounded-full bg-white">{materials.length} 份资料</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <form onSubmit={saveMaterial} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
          <div className="grid gap-3">
            {editingMaterialId && (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-700">
                正在编辑资料索引
                <button type="button" onClick={() => resetForm()} className="inline-flex items-center gap-1 text-xs font-medium">
                  <X className="h-3.5 w-3.5" />
                  取消
                </button>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>孩子</Label>
                <Select value={form.childId} onValueChange={(value) => setForm((current) => ({ ...current, childId: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="family">全家共用</SelectItem>
                    {childProfiles.map((child) => (
                      <SelectItem key={child.id} value={child.id}>
                        {child.firstName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>类型</Label>
                <Select
                  value={form.kind}
                  onValueChange={(value) => setForm((current) => ({ ...current, kind: value as LearningMaterial["kind"] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="file">文件</SelectItem>
                    <SelectItem value="worksheet">练习</SelectItem>
                    <SelectItem value="note">笔记</SelectItem>
                    <SelectItem value="link">链接</SelectItem>
                    <SelectItem value="book">书籍</SelectItem>
                    <SelectItem value="video">视频</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>快速关联</Label>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, childId: "family" }))}
                  className={cn(
                    "rounded-xl border px-2 py-2 text-center text-xs font-medium transition",
                    form.childId === "family" ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-600"
                  )}
                >
                  全家
                </button>
                {childProfiles.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, childId: child.id }))}
                    className={cn(
                      "rounded-xl border px-2 py-2 text-center text-xs font-medium transition",
                      form.childId === child.id ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600"
                    )}
                  >
                    {child.firstName}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="material-file">上传文件</Label>
              <Input
                id="material-file"
                type="file"
                accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                onChange={handleFileChange}
                disabled={Boolean(editingMaterialId)}
                className="h-12 cursor-pointer rounded-xl"
              />
              <p className="text-xs leading-5 text-muted-foreground">
                手机上可直接拍照、选相册或选文件。{editingMaterialId ? "编辑模式暂不替换文件；需要换文件时请删除后重新上传。" : ""}
              </p>
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
                    form.subject === subject ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 bg-white text-slate-600"
                  )}
                >
                  {subject}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="material-url">外部链接</Label>
              <Input
                id="material-url"
                placeholder="可选：网盘、学校链接、视频地址"
                value={form.externalUrl}
                onChange={(event) => setForm((current) => ({ ...current, externalUrl: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="material-notes">备注</Label>
              <Textarea
                id="material-notes"
                placeholder="用途、使用建议、对应考试或阶段"
                value={form.notes}
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
                        active ? "border-amber-400 bg-amber-50 text-amber-700" : "border-slate-200 bg-white text-slate-600"
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
                onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
              />
            </div>
            <Button type="submit" className="h-11 rounded-xl" disabled={!form.title.trim() || !form.subject.trim()}>
              <UploadCloud className="mr-2 h-4 w-4" />
              {editingMaterialId ? "保存资料修改" : "保存资料"}
            </Button>
            {status && <p className="text-xs text-muted-foreground">{status}</p>}
          </div>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">资料索引</p>
              <p className="mt-1 text-xs text-muted-foreground">数据库保存文件本体，导出时生成可搜索索引。</p>
            </div>
            <Badge variant="secondary" className="rounded-full">Storage</Badge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {materials.map((material) => (
              <div key={material.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="rounded-full bg-white">{material.childId ? childById.get(material.childId) : "全家"}</Badge>
                      <Badge variant="secondary" className="rounded-full">{kindLabels[material.kind] ?? material.kind}</Badge>
                    </div>
                    <p className="mt-2 text-sm font-semibold">{material.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {material.subject} · {material.fileName ?? "链接/笔记"} · {formatFileSize(material.fileSize)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => downloadMaterial(material)} aria-label="打开资料">
                      <Download className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => editMaterial(material)} aria-label="编辑资料">
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => deleteMaterial(material)} aria-label="删除资料">
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                {material.notes && <p className="mt-3 text-xs leading-5 text-muted-foreground">{material.notes}</p>}
                {material.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {material.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-600 ring-1 ring-slate-200">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {materials.length === 0 && (
              <p className="rounded-md bg-slate-50 p-4 text-sm text-muted-foreground md:col-span-2">
                还没有资料。今天可以先放一份试卷或讲义，让家长看到资料沉淀方式。
              </p>
            )}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">私有在线版会把文件上传到 Supabase Storage；本地模式会保存在当前浏览器。</p>
        </div>
      </CardContent>
    </Card>
  );
}
