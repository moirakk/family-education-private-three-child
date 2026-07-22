import { NextResponse } from "next/server";
import { assertChildBelongsToFamily, getPrivateWriteContext, jsonError, numberOrNull, parseBody, scoreOneToFive } from "@/app/api/private/_utils";
import { learningRecordInputSchema } from "@/lib/schemas/learning-record";

export async function POST(request: Request) {
  try {
    const { familyId, supabase } = await getPrivateWriteContext(request);
    const payload = parseBody(learningRecordInputSchema, await request.json());
    const childId = payload.childId;
    const subject = payload.subject;
    const title = payload.title;
    await assertChildBelongsToFamily(supabase, familyId, childId);

    const { data, error } = await supabase
      .from("learning_records")
      .insert({
        family_id: familyId,
        child_id: childId,
        subject,
        title,
        record_date: payload.date || new Date().toISOString().slice(0, 10),
        duration_minutes: numberOrNull(payload.durationMinutes) ?? 0,
        score: numberOrNull(payload.score),
        max_score: numberOrNull(payload.maxScore),
        exam_type: payload.examType ?? "quiz",
        notes: payload.notes?.trim() || null,
        confidence: scoreOneToFive(payload.confidence)
      })
      .select("id,child_id,subject,title,record_date,duration_minutes,score,max_score,exam_type,notes,confidence,created_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const { familyId, supabase } = await getPrivateWriteContext(request);
    const recordId = new URL(request.url).searchParams.get("recordId");
    const payload = parseBody(learningRecordInputSchema, await request.json());
    const childId = payload.childId;
    const subject = payload.subject;
    const title = payload.title;
    await assertChildBelongsToFamily(supabase, familyId, childId);

    if (!recordId) return NextResponse.json({ error: "recordId is required" }, { status: 400 });

    const { data, error } = await supabase
      .from("learning_records")
      .update({
        child_id: childId,
        subject,
        title,
        record_date: payload.date || new Date().toISOString().slice(0, 10),
        duration_minutes: numberOrNull(payload.durationMinutes) ?? 0,
        score: numberOrNull(payload.score),
        max_score: numberOrNull(payload.maxScore),
        exam_type: payload.examType ?? "quiz",
        notes: payload.notes?.trim() || null,
        confidence: scoreOneToFive(payload.confidence)
      })
      .eq("family_id", familyId)
      .eq("id", recordId)
      .select("id,child_id,subject,title,record_date,duration_minutes,score,max_score,exam_type,notes,confidence,created_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { familyId, supabase } = await getPrivateWriteContext(request);
    const recordId = new URL(request.url).searchParams.get("recordId");
    if (!recordId) return NextResponse.json({ error: "recordId is required" }, { status: 400 });

    const { error } = await supabase.from("learning_records").delete().eq("family_id", familyId).eq("id", recordId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
