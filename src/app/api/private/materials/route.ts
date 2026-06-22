import { NextResponse } from "next/server";
import { assertChildBelongsToFamily, getPrivateWriteContext, jsonError, numberOrNull, optionalString, requireString } from "@/app/api/private/_utils";
import type { LearningMaterial } from "@/lib/types";

type MaterialPayload = Partial<LearningMaterial>;

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

async function handleMultipartUpload(request: Request) {
  const { familyId, supabase } = getPrivateWriteContext();
  const bucket = process.env.SUPABASE_LEARNING_MATERIALS_BUCKET ?? defaultBucket;
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const title = requireString(formData.get("title"), "title");
  const subject = requireString(formData.get("subject"), "subject");
  const childId = optionalString(formData.get("childId"));
  const kind = (optionalString(formData.get("kind")) ?? "file") as LearningMaterial["kind"];
  const notes = optionalString(formData.get("notes"));
  const externalUrl = optionalString(formData.get("externalUrl"));
  const tags = optionalString(formData.get("tags"))?.split(",").map((tag) => tag.trim()).filter(Boolean) ?? [];
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

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

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
    .select("id,child_id,title,subject,kind,file_name,file_size,mime_type,storage_path,external_url,notes,tags,created_at,updated_at")
    .single();

  if (error) {
    await supabase.storage.from(bucket).remove([storagePath]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: mapMaterialRow(data) }, { status: 201 });
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      return handleMultipartUpload(request);
    }

    const { familyId, supabase } = getPrivateWriteContext();
    const payload = (await request.json()) as MaterialPayload;
    const title = requireString(payload.title, "title");
    const subject = requireString(payload.subject, "subject");
    if (payload.childId) await assertChildBelongsToFamily(supabase, familyId, payload.childId);

    const { data, error } = await supabase
      .from("learning_materials")
      .insert({
        family_id: familyId,
        child_id: payload.childId ?? null,
        title,
        subject,
        kind: payload.kind ?? "file",
        file_name: optionalString(payload.fileName),
        file_size: numberOrNull(payload.fileSize),
        mime_type: optionalString(payload.mimeType),
        storage_path: optionalString(payload.storagePath),
        external_url: optionalString(payload.externalUrl),
        notes: optionalString(payload.notes),
        tags: payload.tags ?? []
      })
      .select("id,child_id,title,subject,kind,file_name,file_size,mime_type,storage_path,external_url,notes,tags,created_at,updated_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: mapMaterialRow(data) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function GET(request: Request) {
  try {
    const { familyId, supabase } = getPrivateWriteContext();
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

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      if (data.external_url) {
        return NextResponse.json({ data: { url: data.external_url } });
      }

      if (!data.storage_path) {
        return NextResponse.json({ error: "material has no downloadable source" }, { status: 404 });
      }

      const signed = await supabase.storage.from(bucket).createSignedUrl(data.storage_path, 60 * 10);
      if (signed.error) return NextResponse.json({ error: signed.error.message }, { status: 500 });
      return NextResponse.json({ data: { url: signed.data.signedUrl } });
    }

    const { data, error } = await supabase
      .from("learning_materials")
      .select("id,child_id,title,subject,kind,file_name,file_size,mime_type,storage_path,external_url,notes,tags,created_at,updated_at")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: (data ?? []).map(mapMaterialRow) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const { familyId, supabase } = getPrivateWriteContext();
    const materialId = new URL(request.url).searchParams.get("materialId");
    const payload = (await request.json()) as MaterialPayload;
    const title = requireString(payload.title, "title");
    const subject = requireString(payload.subject, "subject");

    if (!materialId) return NextResponse.json({ error: "materialId is required" }, { status: 400 });
    if (payload.childId) await assertChildBelongsToFamily(supabase, familyId, payload.childId);

    const { data, error } = await supabase
      .from("learning_materials")
      .update({
        child_id: payload.childId ?? null,
        title,
        subject,
        kind: payload.kind ?? "file",
        external_url: optionalString(payload.externalUrl),
        notes: optionalString(payload.notes),
        tags: payload.tags ?? []
      })
      .eq("family_id", familyId)
      .eq("id", materialId)
      .select("id,child_id,title,subject,kind,file_name,file_size,mime_type,storage_path,external_url,notes,tags,created_at,updated_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: mapMaterialRow(data) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { familyId, supabase } = getPrivateWriteContext();
    const materialId = new URL(request.url).searchParams.get("materialId");
    if (!materialId) return NextResponse.json({ error: "materialId is required" }, { status: 400 });

    const bucket = process.env.SUPABASE_LEARNING_MATERIALS_BUCKET ?? defaultBucket;
    const { data: material } = await supabase
      .from("learning_materials")
      .select("storage_path")
      .eq("family_id", familyId)
      .eq("id", materialId)
      .maybeSingle();

    const { error } = await supabase.from("learning_materials").delete().eq("family_id", familyId).eq("id", materialId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (material?.storage_path) {
      await supabase.storage.from(bucket).remove([material.storage_path]);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
