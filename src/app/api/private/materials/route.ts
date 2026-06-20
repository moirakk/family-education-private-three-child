import { NextResponse } from "next/server";
import { getPrivateWriteContext, jsonError, numberOrNull, optionalString, requireString } from "@/app/api/private/_utils";
import type { LearningMaterial } from "@/lib/types";

type MaterialPayload = Partial<LearningMaterial>;

export async function POST(request: Request) {
  try {
    const { familyId, supabase } = getPrivateWriteContext();
    const payload = (await request.json()) as MaterialPayload;
    const title = requireString(payload.title, "title");
    const subject = requireString(payload.subject, "subject");

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
        external_url: optionalString(payload.externalUrl),
        notes: optionalString(payload.notes),
        tags: payload.tags ?? []
      })
      .select("id,child_id,title,subject,kind,file_name,file_size,mime_type,external_url,notes,tags,created_at,updated_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { familyId, supabase } = getPrivateWriteContext();
    const materialId = new URL(request.url).searchParams.get("materialId");
    if (!materialId) return NextResponse.json({ error: "materialId is required" }, { status: 400 });

    const { error } = await supabase.from("learning_materials").delete().eq("family_id", familyId).eq("id", materialId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
