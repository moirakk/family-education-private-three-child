import { NextResponse } from "next/server";
import {
  assertChildBelongsToFamily,
  numberOrNull,
  parseBody,
  requireQueryParam,
  scoreOneToFive,
  supabaseError,
  withPrivateRoute
} from "@/app/api/private/_utils";
import { learningRecordInputSchema } from "@/lib/schemas/learning-record";

function recordColumnValues(payload: import("zod").infer<typeof learningRecordInputSchema>) {
  return {
    child_id: payload.childId,
    subject: payload.subject,
    title: payload.title,
    record_date: payload.date || new Date().toISOString().slice(0, 10),
    duration_minutes: numberOrNull(payload.durationMinutes) ?? 0,
    score: numberOrNull(payload.score),
    max_score: numberOrNull(payload.maxScore),
    exam_type: payload.examType ?? "quiz",
    notes: payload.notes?.trim() || null,
    confidence: scoreOneToFive(payload.confidence)
  };
}

const recordSelectColumns = "id,child_id,subject,title,record_date,duration_minutes,score,max_score,exam_type,notes,confidence,created_at";

export const POST = withPrivateRoute(async ({ familyId, supabase }, request) => {
  const payload = parseBody(learningRecordInputSchema, await request.json());
  await assertChildBelongsToFamily(supabase, familyId, payload.childId);

  const { data, error } = await supabase
    .from("learning_records")
    .insert({ family_id: familyId, ...recordColumnValues(payload) })
    .select(recordSelectColumns)
    .single();

  if (error) return supabaseError(error);
  return NextResponse.json({ data }, { status: 201 });
});

export const PUT = withPrivateRoute(async ({ familyId, supabase }, request) => {
  const payload = parseBody(learningRecordInputSchema, await request.json());
  await assertChildBelongsToFamily(supabase, familyId, payload.childId);

  const recordId = requireQueryParam(request, "recordId");

  const { data, error } = await supabase
    .from("learning_records")
    .update(recordColumnValues(payload))
    .eq("family_id", familyId)
    .eq("id", recordId)
    .select(recordSelectColumns)
    .single();

  if (error) return supabaseError(error);
  return NextResponse.json({ data });
});

export const DELETE = withPrivateRoute(async ({ familyId, supabase }, request) => {
  const recordId = requireQueryParam(request, "recordId");

  const { error } = await supabase.from("learning_records").delete().eq("family_id", familyId).eq("id", recordId);
  if (error) return supabaseError(error);
  return NextResponse.json({ ok: true });
});
