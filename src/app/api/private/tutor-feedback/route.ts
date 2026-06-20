import { NextResponse } from "next/server";
import { getPrivateWriteContext, jsonError, numberOrNull, optionalString, requireString, scoreOneToFive } from "@/app/api/private/_utils";
import type { TutorFeedback } from "@/lib/types";

type TutorFeedbackPayload = Partial<TutorFeedback>;

export async function POST(request: Request) {
  try {
    const { familyId, supabase } = getPrivateWriteContext();
    const payload = (await request.json()) as TutorFeedbackPayload;
    const childId = requireString(payload.childId, "childId");
    const tutorName = requireString(payload.tutorName, "tutorName");
    const subject = requireString(payload.subject, "subject");
    const focus = requireString(payload.focus, "focus");

    const { data, error } = await supabase
      .from("tutor_feedback")
      .insert({
        family_id: familyId,
        child_id: childId,
        tutor_name: tutorName,
        subject,
        session_date: payload.sessionDate || new Date().toISOString().slice(0, 10),
        duration_minutes: numberOrNull(payload.durationMinutes) ?? 0,
        focus,
        performance: optionalString(payload.performance),
        homework: optionalString(payload.homework),
        next_focus: optionalString(payload.nextFocus),
        rating: scoreOneToFive(payload.rating)
      })
      .select("id,child_id,tutor_name,subject,session_date,duration_minutes,focus,performance,homework,next_focus,rating,created_at")
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
    const feedbackId = new URL(request.url).searchParams.get("feedbackId");
    if (!feedbackId) return NextResponse.json({ error: "feedbackId is required" }, { status: 400 });

    const { error } = await supabase.from("tutor_feedback").delete().eq("family_id", familyId).eq("id", feedbackId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
