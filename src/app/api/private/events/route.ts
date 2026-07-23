import { NextResponse } from "next/server";
import {
  assertChildrenBelongToFamily,
  optionalString,
  parseBody,
  requireQueryParam,
  supabaseError,
  withPrivateRoute
} from "@/app/api/private/_utils";
import type { EventCategory } from "@/lib/types";
import { eventInputSchema } from "@/lib/schemas/event";

function mapEventRow(data: {
  id: string;
  title: string;
  category: EventCategory;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  description: string | null;
  recurrence_rule: string | null;
  recurrence_end: string | null;
  all_day: boolean;
}, childIds: string[]) {
  return {
    id: data.id,
    title: data.title,
    category: data.category,
    starts_at: data.starts_at,
    ends_at: data.ends_at,
    location: data.location,
    description: data.description,
    recurrence_rule: data.recurrence_rule,
    recurrence_end: data.recurrence_end,
    all_day: data.all_day,
    childIds
  };
}

function eventColumnValues(payload: import("zod").infer<typeof eventInputSchema>) {
  return {
    title: payload.title,
    category: payload.category,
    starts_at: payload.startsAt,
    ends_at: payload.endsAt ?? null,
    location: optionalString(payload.location) ?? "",
    description: optionalString(payload.description) ?? "",
    recurrence_rule: optionalString(payload.recurrenceRule),
    recurrence_end: optionalString(payload.recurrenceEnd),
    all_day: Boolean(payload.allDay)
  };
}

const eventSelectColumns = "id,title,category,starts_at,ends_at,location,description,recurrence_rule,recurrence_end,all_day";

export const POST = withPrivateRoute(async ({ familyId, supabase }, request) => {
  const payload = parseBody(eventInputSchema, await request.json());
  const childIds = payload.childIds;

  await assertChildrenBelongToFamily(supabase, familyId, childIds);

  const { data, error } = await supabase
    .from("calendar_events")
    .insert({ family_id: familyId, source: "parent", ...eventColumnValues(payload) })
    .select(eventSelectColumns)
    .single();

  if (error) return supabaseError(error);

  const eventId = data.id as string;
  const { error: linkError } = await supabase.from("calendar_event_children").insert(
    childIds.map((childId) => ({
      event_id: eventId,
      child_id: childId
    }))
  );

  if (linkError) return supabaseError(linkError);

  return NextResponse.json({ data: mapEventRow(data, childIds) }, { status: 201 });
});

export const PUT = withPrivateRoute(async ({ familyId, supabase }, request) => {
  const payload = parseBody(eventInputSchema, await request.json());
  const childIds = payload.childIds;
  const eventId = requireQueryParam(request, "eventId");

  await assertChildrenBelongToFamily(supabase, familyId, childIds);

  const { data, error } = await supabase
    .from("calendar_events")
    .update(eventColumnValues(payload))
    .eq("family_id", familyId)
    .eq("id", eventId)
    .select(eventSelectColumns)
    .single();

  if (error) return supabaseError(error);

  const deleteLinks = await supabase.from("calendar_event_children").delete().eq("event_id", eventId);
  if (deleteLinks.error) return supabaseError(deleteLinks.error);

  const insertLinks = await supabase.from("calendar_event_children").insert(
    childIds.map((childId) => ({
      event_id: eventId,
      child_id: childId
    }))
  );
  if (insertLinks.error) return supabaseError(insertLinks.error);

  return NextResponse.json({ data: mapEventRow(data, childIds) });
});

export const DELETE = withPrivateRoute(async ({ familyId, supabase }, request) => {
  const eventId = requireQueryParam(request, "eventId");

  const { error } = await supabase.from("calendar_events").delete().eq("family_id", familyId).eq("id", eventId);
  if (error) return supabaseError(error);

  return NextResponse.json({ ok: true });
});
