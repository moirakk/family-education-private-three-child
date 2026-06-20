import { NextResponse } from "next/server";
import { getPrivateWriteContext, jsonError, numberOrNull, optionalString, requireString, scoreOneToFive } from "@/app/api/private/_utils";
import type { TutorFeedback } from "@/lib/types";

type TutorFeedbackPayload = Partial<TutorFeedback>;

function mapFeedbackRow(data: {
  id: string;
  child_id: string;
  tutor_name: string;
  subject: string;
  session_date: string;
  duration_minutes: number | null;
  focus: string;
  performance: string | null;
  homework: string | null;
  next_focus: string | null;
  rating: number;
  created_at: string;
}) {
  return {
    id: data.id,
    childId: data.child_id,
    tutorName: data.tutor_name,
    subject: data.subject,
    sessionDate: data.session_date,
    durationMinutes: data.duration_minutes ?? 0,
    focus: data.focus,
    performance: data.performance ?? "",
    homework: data.homework ?? "",
    nextFocus: data.next_focus ?? "",
    rating: data.rating,
    createdAt: data.created_at
  };
}

export async function GET() {
  try {
    const { familyId, supabase } = getPrivateWriteContext();
    const { data, error } = await supabase
      .from("tutor_feedback")
      .select("id,child_id,tutor_name,subject,session_date,duration_minutes,focus,performance,homework,next_focus,rating,created_at")
      .eq("family_id", familyId)
      .order("session_date", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: (data ?? []).map(mapFeedbackRow) });
  } catch (error) {
    return jsonError(error);
  }
}

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
    return NextResponse.json({ data: mapFeedbackRow(data) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const { familyId, supabase } = getPrivateWriteContext();
    const feedbackId = new URL(request.url).searchParams.get("feedbackId");
    const payload = (await request.json()) as TutorFeedbackPayload;
    const childId = requireString(payload.childId, "childId");
    const tutorName = requireString(payload.tutorName, "tutorName");
    const subject = requireString(payload.subject, "subject");
    const focus = requireString(payload.focus, "focus");

    if (!feedbackId) return NextResponse.json({ error: "feedbackId is required" }, { status: 400 });

    const { data, error } = await supabase
      .from("tutor_feedback")
      .update({
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
      .eq("family_id", familyId)
      .eq("id", feedbackId)
      .select("id,child_id,tutor_name,subject,session_date,duration_minutes,focus,performance,homework,next_focus,rating,created_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: mapFeedbackRow(data) });
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
