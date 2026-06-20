import { NextResponse } from "next/server";
import { getPrivateWriteContext, jsonError, optionalString, requireString, scoreOneToFive } from "@/app/api/private/_utils";
import type { SelfEvaluation } from "@/lib/types";

type SelfEvaluationPayload = Partial<SelfEvaluation>;

export async function POST(request: Request) {
  try {
    const { familyId, supabase } = getPrivateWriteContext();
    const payload = (await request.json()) as SelfEvaluationPayload;
    const childId = requireString(payload.childId, "childId");
    const subject = requireString(payload.subject, "subject");
    const reflection = requireString(payload.reflection, "reflection");

    const { data, error } = await supabase
      .from("self_evaluations")
      .insert({
        family_id: familyId,
        child_id: childId,
        evaluation_date: payload.evaluationDate || new Date().toISOString().slice(0, 10),
        subject,
        mood: scoreOneToFive(payload.mood),
        effort: scoreOneToFive(payload.effort),
        confidence: scoreOneToFive(payload.confidence),
        reflection,
        next_step: optionalString(payload.nextStep)
      })
      .select("id,child_id,evaluation_date,subject,mood,effort,confidence,reflection,next_step,created_at")
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
    const evaluationId = new URL(request.url).searchParams.get("evaluationId");
    if (!evaluationId) return NextResponse.json({ error: "evaluationId is required" }, { status: 400 });

    const { error } = await supabase.from("self_evaluations").delete().eq("family_id", familyId).eq("id", evaluationId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
