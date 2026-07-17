import { NextResponse } from "next/server";
import { assertChildrenBelongToFamily, getPrivateWriteContext, jsonError, optionalString, requireString } from "@/app/api/private/_utils";
import type { EventCategory } from "@/lib/types";

type EventPayload = {
  title?: string;
  category?: EventCategory;
  startsAt?: string;
  endsAt?: string;
  location?: string;
  description?: string;
  childIds?: string[];
  allDay?: boolean;
  recurrenceRule?: string;
  recurrenceEnd?: string;
};

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

export async function POST(request: Request) {
  try {
    const { familyId, supabase } = getPrivateWriteContext();
    const payload = (await request.json()) as EventPayload;
    const title = requireString(payload.title, "title");
    const category = requireString(payload.category, "category") as EventCategory;
    const startsAt = requireString(payload.startsAt, "startsAt");
    const childIds = payload.childIds ?? [];

    if (!childIds.length) {
      return NextResponse.json({ error: "title, category, startsAt and childIds are required" }, { status: 400 });
    }
    await assertChildrenBelongToFamily(supabase, familyId, childIds);

    const { data, error } = await supabase
      .from("calendar_events")
      .insert({
        family_id: familyId,
        title,
        category,
        source: "parent",
        starts_at: startsAt,
        ends_at: payload.endsAt ?? null,
        location: optionalString(payload.location) ?? "",
        description: optionalString(payload.description) ?? ""
        ,recurrence_rule: optionalString(payload.recurrenceRule)
        ,recurrence_end: optionalString(payload.recurrenceEnd)
        ,all_day: Boolean(payload.allDay)
      })
      .select("id,title,category,starts_at,ends_at,location,description,recurrence_rule,recurrence_end,all_day")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const eventId = data.id as string;
    const { error: linkError } = await supabase.from("calendar_event_children").insert(
      childIds.map((childId) => ({
        event_id: eventId,
        child_id: childId
      }))
    );

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 500 });
    }

    return NextResponse.json({ data: mapEventRow(data, childIds) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const { familyId, supabase } = getPrivateWriteContext();
    const url = new URL(request.url);
    const eventId = url.searchParams.get("eventId");
    const payload = (await request.json()) as EventPayload;
    const title = requireString(payload.title, "title");
    const category = requireString(payload.category, "category") as EventCategory;
    const startsAt = requireString(payload.startsAt, "startsAt");
    const childIds = payload.childIds ?? [];

    if (!eventId) return NextResponse.json({ error: "eventId is required" }, { status: 400 });
    if (!childIds.length) return NextResponse.json({ error: "childIds is required" }, { status: 400 });
    await assertChildrenBelongToFamily(supabase, familyId, childIds);

    const { data, error } = await supabase
      .from("calendar_events")
      .update({
        title,
        category,
        starts_at: startsAt,
        ends_at: payload.endsAt ?? null,
        location: optionalString(payload.location) ?? "",
        description: optionalString(payload.description) ?? ""
        ,recurrence_rule: optionalString(payload.recurrenceRule)
        ,recurrence_end: optionalString(payload.recurrenceEnd)
        ,all_day: Boolean(payload.allDay)
      })
      .eq("family_id", familyId)
      .eq("id", eventId)
      .select("id,title,category,starts_at,ends_at,location,description,recurrence_rule,recurrence_end,all_day")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const deleteLinks = await supabase.from("calendar_event_children").delete().eq("event_id", eventId);
    if (deleteLinks.error) return NextResponse.json({ error: deleteLinks.error.message }, { status: 500 });

    const insertLinks = await supabase.from("calendar_event_children").insert(
      childIds.map((childId) => ({
        event_id: eventId,
        child_id: childId
      }))
    );
    if (insertLinks.error) return NextResponse.json({ error: insertLinks.error.message }, { status: 500 });

    return NextResponse.json({ data: mapEventRow(data, childIds) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { familyId, supabase } = getPrivateWriteContext();
    const url = new URL(request.url);
    const eventId = url.searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json({ error: "eventId is required" }, { status: 400 });
    }

    const { error } = await supabase.from("calendar_events").delete().eq("family_id", familyId).eq("id", eventId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
