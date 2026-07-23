import { NextResponse } from "next/server";
import {
  assertChildBelongsToFamily,
  getAccessRoleFromRequest,
  getTutorInviteScopeFromRequest,
  numberOrNull,
  optionalString,
  parseBody,
  requireQueryParam,
  requireString,
  scoreOneToFive,
  supabaseError,
  withPrivateRoute
} from "@/app/api/private/_utils";
import { tutorFeedbackInputSchema } from "@/lib/schemas/tutor-feedback";

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

function feedbackColumnValues(
  payload: import("zod").infer<typeof tutorFeedbackInputSchema>,
  identity: { childId: string; tutorName: string; subject: string }
) {
  return {
    child_id: identity.childId,
    tutor_name: identity.tutorName,
    subject: identity.subject,
    session_date: payload.sessionDate || new Date().toISOString().slice(0, 10),
    duration_minutes: numberOrNull(payload.durationMinutes) ?? 0,
    focus: payload.focus,
    performance: optionalString(payload.performance),
    homework: optionalString(payload.homework),
    next_focus: optionalString(payload.nextFocus),
    rating: scoreOneToFive(payload.rating)
  };
}

const feedbackSelectColumns =
  "id,child_id,tutor_name,subject,session_date,duration_minutes,focus,performance,homework,next_focus,rating,created_at";

export const GET = withPrivateRoute(async ({ familyId, supabase }) => {
  const { data, error } = await supabase
    .from("tutor_feedback")
    .select(feedbackSelectColumns)
    .eq("family_id", familyId)
    .order("session_date", { ascending: false });

  if (error) return supabaseError(error);
  return NextResponse.json({ data: (data ?? []).map(mapFeedbackRow) });
});

export const POST = withPrivateRoute(async ({ familyId, supabase }, request) => {
  const payload = parseBody(tutorFeedbackInputSchema, await request.json());
  const role = getAccessRoleFromRequest(request);
  const tutorScope = role === "tutor" ? getTutorInviteScopeFromRequest(request) : null;
  if (role === "tutor" && !tutorScope) {
    return NextResponse.json({ error: "A scoped tutor invitation is required." }, { status: 403 });
  }

  const childId = tutorScope?.childId ?? requireString(payload.childId, "childId");
  const tutorName = tutorScope?.tutorName ?? requireString(payload.tutorName, "tutorName");
  const subject = tutorScope?.subject ?? requireString(payload.subject, "subject");
  await assertChildBelongsToFamily(supabase, familyId, childId);

  const { data, error } = await supabase
    .from("tutor_feedback")
    .insert({ family_id: familyId, ...feedbackColumnValues(payload, { childId, tutorName, subject }) })
    .select(feedbackSelectColumns)
    .single();

  if (error) return supabaseError(error);
  return NextResponse.json({ data: mapFeedbackRow(data) }, { status: 201 });
});

export const PUT = withPrivateRoute(async ({ familyId, supabase }, request) => {
  const payload = parseBody(tutorFeedbackInputSchema, await request.json());
  const childId = requireString(payload.childId, "childId");
  const tutorName = requireString(payload.tutorName, "tutorName");
  const subject = requireString(payload.subject, "subject");
  await assertChildBelongsToFamily(supabase, familyId, childId);

  const feedbackId = requireQueryParam(request, "feedbackId");

  const { data, error } = await supabase
    .from("tutor_feedback")
    .update(feedbackColumnValues(payload, { childId, tutorName, subject }))
    .eq("family_id", familyId)
    .eq("id", feedbackId)
    .select(feedbackSelectColumns)
    .single();

  if (error) return supabaseError(error);
  return NextResponse.json({ data: mapFeedbackRow(data) });
});

export const DELETE = withPrivateRoute(async ({ familyId, supabase }, request) => {
  const feedbackId = requireQueryParam(request, "feedbackId");

  const { error } = await supabase.from("tutor_feedback").delete().eq("family_id", familyId).eq("id", feedbackId);
  if (error) return supabaseError(error);
  return NextResponse.json({ ok: true });
});
