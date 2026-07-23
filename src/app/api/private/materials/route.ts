import { NextResponse } from "next/server";
import {
  assertChildBelongsToFamily,
  numberOrNull,
  optionalString,
  parseBody,
  requireQueryParam,
  supabaseError,
  withPrivateRoute,
  type PrivateRouteContext
} from "@/app/api/private/_utils";
import type { LearningMaterial } from "@/lib/types";
import { materialFormInputSchema, materialInputSchema } from "@/lib/schemas/material";

const defaultBucket = "learning-materials";

function mapMaterialRow(data: {
  id: string;
  child_id: string | null;
  title: string;
  subject: string;
  kind: LearningMaterial["kind"];
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  storage_path?: string | null;
  external_url: string | null;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}) {
  return {
    id: data.id,
    childId: data.child_id ?? undefined,
    title: data.title,
    subject: data.subject,
    kind: data.kind,
    fileName: data.file_name ?? undefined,
    fileSize: data.file_size ?? undefined,
    mimeType: data.mime_type ?? undefined,
    storagePath: data.storage_path ?? undefined,
    externalUrl: data.external_url ?? undefined,
    notes: data.notes ?? undefined,
    tags: data.tags ?? [],
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

function safePathSegment(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

const materialSelectColumns =
  "id,child_id,title,subject,kind,file_name,file_size,mime_type,storage_path,external_url,notes,tags,created_at,updated_at";

async function handleMultipartUpload({ familyId, supabase }: PrivateRouteContext, request: Request) {
  const bucket = process.env.SUPABASE_LEARNING_MATERIALS_BUCKET ?? defaultBucket;
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const formPayload = parseBody(materialFormInputSchema, {
    title: formData.get("title"),
    subject: formData.get("subject"),
    childId: formData.get("childId"),
    kind: formData.get("kind"),
    notes: formData.get("notes"),
    externalUrl: formData.get("externalUrl"),
    tags: formData.get("tags")
  });
  const title = formPayload.title;
  const subject = formPayload.subject;
  const childId = optionalString(formPayload.childId);
  const kind = formPayload.kind ?? "file";
  const notes = optionalString(formPayload.notes);
  const externalUrl = optionalString(formPayload.externalUrl);
  const tags = optionalString(formPayload.tags)?.split(",").map((tag) => tag.trim()).filter(Boolean) ?? [];
  const fileName = file.name || `${title}.bin`;
  if (childId) await assertChildBelongsToFamily(supabase, familyId, childId);
  const storagePath = [
    familyId,
    childId ?? "family",
    `${Date.now()}-${safePathSegment(fileName) || "material"}`
  ].join("/");

  const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false
  });

  if (uploadError) return supabaseError(uploadError);

  const { data, error } = await supabase
    .from("learning_materials")
    .insert({
      family_id: familyId,
      child_id: childId,
      title,
      subject,
      kind,
      file_name: fileName,
      file_size: file.size,
      mime_type: file.type || null,
      storage_path: storagePath,
      external_url: externalUrl,
      notes,
      tags
    })
    .select(materialSelectColumns)
    .single();

  if (error) {
    await supabase.storage.from(bucket).remove([storagePath]);
    return supabaseError(error);
  }

  return NextResponse.json({ data: mapMaterialRow(data) }, { status: 201 });
}

export const POST = withPrivateRoute(async (context, request) => {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    return handleMultipartUpload(context, request);
  }

  const { familyId, supabase } = context;
  const payload = parseBody(materialInputSchema, await request.json());
  if (payload.childId) await assertChildBelongsToFamily(supabase, familyId, payload.childId);

  const { data, error } = await supabase
    .from("learning_materials")
    .insert({
      family_id: familyId,
      child_id: payload.childId ?? null,
      title: payload.title,
      subject: payload.subject,
      kind: payload.kind ?? "file",
      file_name: optionalString(payload.fileName),
      file_size: numberOrNull(payload.fileSize),
      mime_type: optionalString(payload.mimeType),
      storage_path: optionalString(payload.storagePath),
      external_url: optionalString(payload.externalUrl),
      notes: optionalString(payload.notes),
      tags: payload.tags ?? []
    })
    .select(materialSelectColumns)
    .single();

  if (error) return supabaseError(error);
  return NextResponse.json({ data: mapMaterialRow(data) }, { status: 201 });
});

export const GET = withPrivateRoute(async ({ familyId, supabase }, request) => {
  const url = new URL(request.url);
  const materialId = url.searchParams.get("materialId");
  const bucket = process.env.SUPABASE_LEARNING_MATERIALS_BUCKET ?? defaultBucket;

  if (materialId) {
    const { data, error } = await supabase
      .from("learning_materials")
      .select("external_url,storage_path")
      .eq("family_id", familyId)
      .eq("id", materialId)
      .single();

    if (error) return supabaseError(error);

    if (data.external_url) {
      return NextResponse.json({ data: { url: data.external_url } });
    }

    if (!data.storage_path) {
      return NextResponse.json({ error: "material has no downloadable source" }, { status: 404 });
    }

    const signed = await supabase.storage.from(bucket).createSignedUrl(data.storage_path, 60 * 10);
    if (signed.error) return supabaseError(signed.error);
    return NextResponse.json({ data: { url: signed.data.signedUrl } });
  }

  const { data, error } = await supabase
    .from("learning_materials")
    .select(materialSelectColumns)
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });

  if (error) return supabaseError(error);
  return NextResponse.json({ data: (data ?? []).map(mapMaterialRow) });
});

export const PUT = withPrivateRoute(async ({ familyId, supabase }, request) => {
  const payload = parseBody(materialInputSchema, await request.json());
  const materialId = requireQueryParam(request, "materialId");

  if (payload.childId) await assertChildBelongsToFamily(supabase, familyId, payload.childId);

  const { data, error } = await supabase
    .from("learning_materials")
    .update({
      child_id: payload.childId ?? null,
      title: payload.title,
      subject: payload.subject,
      kind: payload.kind ?? "file",
      external_url: optionalString(payload.externalUrl),
      notes: optionalString(payload.notes),
      tags: payload.tags ?? []
    })
    .eq("family_id", familyId)
    .eq("id", materialId)
    .select(materialSelectColumns)
    .single();

  if (error) return supabaseError(error);
  return NextResponse.json({ data: mapMaterialRow(data) });
});

export const DELETE = withPrivateRoute(async ({ familyId, supabase }, request) => {
  const materialId = requireQueryParam(request, "materialId");

  const bucket = process.env.SUPABASE_LEARNING_MATERIALS_BUCKET ?? defaultBucket;
  const { data: material } = await supabase
    .from("learning_materials")
    .select("storage_path")
    .eq("family_id", familyId)
    .eq("id", materialId)
    .maybeSingle();

  const { error } = await supabase.from("learning_materials").delete().eq("family_id", familyId).eq("id", materialId);
  if (error) return supabaseError(error);

  if (material?.storage_path) {
    await supabase.storage.from(bucket).remove([material.storage_path]);
  }

  return NextResponse.json({ ok: true });
});
