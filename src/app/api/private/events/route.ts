import { NextResponse } from "next/server";
import { assertPrivateWriteConfigured, getSupabaseAdminClient } from "@/lib/supabase-admin";
import type { EventCategory } from "@/lib/types";

type EventPayload = {
  title?: string;
  category?: EventCategory;
  startsAt?: string;
  endsAt?: string;
  location?: string;
  description?: string;
  childIds?: string[];
};

export async function POST(request: Request) {
  try {
    assertPrivateWriteConfigured();
    const familyId = process.env.NEXT_PUBLIC_PRIVATE_FAMILY_ID;
    const payload = (await request.json()) as EventPayload;

    if (!familyId || !payload.title || !payload.category || !payload.startsAt || !payload.childIds?.length) {
      return NextResponse.json({ error: "title, category, startsAt and childIds are required" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("calendar_events")
      .insert({
        family_id: familyId,
        title: payload.title,
        category: payload.category,
        source: "parent",
        starts_at: payload.startsAt,
        ends_at: payload.endsAt ?? null,
        location: payload.location ?? "",
        description: payload.description ?? ""
      })
      .select("id,title,category,starts_at,ends_at,location")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const eventId = data.id as string;
    const { error: linkError } = await supabase.from("calendar_event_children").insert(
      payload.childIds.map((childId) => ({
        event_id: eventId,
        child_id: childId
      }))
    );

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 500 });
    }

    return NextResponse.json({ data: { ...data, childIds: payload.childIds } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    assertPrivateWriteConfigured();
    const url = new URL(request.url);
    const eventId = url.searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json({ error: "eventId is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from("calendar_events").delete().eq("id", eventId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
