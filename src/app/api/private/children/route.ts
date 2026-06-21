import { NextResponse } from "next/server";
import { getPrivateWriteContext, jsonError, numberOrNull, optionalString, requireString } from "@/app/api/private/_utils";
import type { Child } from "@/lib/types";

type ChildPayload = Partial<Child>;

function arrayOrEmpty(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
}

function mapChildRow(data: {
  id: string;
  first_name: string;
  last_name: string | null;
  age: number | null;
  grade: string | null;
  school_name: string | null;
  school_program: string | null;
  avatar_color: string;
  interests: string[] | null;
  focus_areas: string[] | null;
}) {
  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name ?? "",
    age: data.age ?? 0,
    grade: data.grade ?? "",
    schoolName: data.school_name ?? "",
    schoolProgram: data.school_program ?? "",
    avatarColor: data.avatar_color,
    interests: data.interests ?? [],
    focusAreas: data.focus_areas ?? []
  };
}

export async function POST(request: Request) {
  try {
    const { familyId, supabase } = getPrivateWriteContext();
    const payload = (await request.json()) as ChildPayload;
    const firstName = requireString(payload.firstName, "firstName");

    const { data, error } = await supabase
      .from("children")
      .insert({
        family_id: familyId,
        first_name: firstName,
        last_name: optionalString(payload.lastName),
        age: numberOrNull(payload.age),
        grade: optionalString(payload.grade),
        school_name: optionalString(payload.schoolName),
        school_program: optionalString(payload.schoolProgram),
        avatar_color: optionalString(payload.avatarColor) ?? "#2563eb",
        interests: arrayOrEmpty(payload.interests),
        focus_areas: arrayOrEmpty(payload.focusAreas)
      })
      .select("id,first_name,last_name,age,grade,school_name,school_program,avatar_color,interests,focus_areas")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: mapChildRow(data) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const { familyId, supabase } = getPrivateWriteContext();
    const childId = new URL(request.url).searchParams.get("childId");
    const payload = (await request.json()) as ChildPayload;
    const firstName = requireString(payload.firstName, "firstName");

    if (!childId) return NextResponse.json({ error: "childId is required" }, { status: 400 });

    const { data, error } = await supabase
      .from("children")
      .update({
        first_name: firstName,
        last_name: optionalString(payload.lastName),
        age: numberOrNull(payload.age),
        grade: optionalString(payload.grade),
        school_name: optionalString(payload.schoolName),
        school_program: optionalString(payload.schoolProgram),
        avatar_color: optionalString(payload.avatarColor) ?? "#2563eb",
        interests: arrayOrEmpty(payload.interests),
        focus_areas: arrayOrEmpty(payload.focusAreas)
      })
      .eq("family_id", familyId)
      .eq("id", childId)
      .select("id,first_name,last_name,age,grade,school_name,school_program,avatar_color,interests,focus_areas")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: mapChildRow(data) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { familyId, supabase } = getPrivateWriteContext();
    const childId = new URL(request.url).searchParams.get("childId");
    if (!childId) return NextResponse.json({ error: "childId is required" }, { status: 400 });

    const { count, error: countError } = await supabase
      .from("children")
      .select("id", { count: "exact", head: true })
      .eq("family_id", familyId);

    if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });
    if ((count ?? 0) <= 1) return NextResponse.json({ error: "At least one child profile is required" }, { status: 400 });

    const { error } = await supabase.from("children").delete().eq("family_id", familyId).eq("id", childId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
