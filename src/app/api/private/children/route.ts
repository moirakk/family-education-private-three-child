import { NextResponse } from "next/server";
import {
  numberOrNull,
  optionalString,
  parseBody,
  requireQueryParam,
  supabaseError,
  withPrivateRoute,
  type PrivateSupabaseClient
} from "@/app/api/private/_utils";
import { childInputSchema } from "@/lib/schemas/child";

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

function childColumnValues(payload: import("zod").infer<typeof childInputSchema>) {
  return {
    first_name: payload.firstName,
    last_name: optionalString(payload.lastName),
    age: numberOrNull(payload.age),
    grade: optionalString(payload.grade),
    school_name: optionalString(payload.schoolName),
    school_program: optionalString(payload.schoolProgram),
    avatar_color: optionalString(payload.avatarColor) ?? "#2563eb",
    interests: arrayOrEmpty(payload.interests),
    focus_areas: arrayOrEmpty(payload.focusAreas)
  };
}

const childSelectColumns = "id,first_name,last_name,age,grade,school_name,school_program,avatar_color,interests,focus_areas";

async function countRows(supabase: PrivateSupabaseClient, table: string, childId: string) {
  const { count, error } = await supabase.from(table).select("child_id", { count: "exact", head: true }).eq("child_id", childId);
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
}

async function getChildDependencyCount(supabase: PrivateSupabaseClient, childId: string) {
  const counts = await Promise.all([
    countRows(supabase, "child_intake_profiles", childId),
    countRows(supabase, "calendar_event_children", childId),
    countRows(supabase, "learning_records", childId),
    countRows(supabase, "education_goals", childId),
    countRows(supabase, "resources", childId),
    countRows(supabase, "learning_materials", childId),
    countRows(supabase, "self_evaluations", childId),
    countRows(supabase, "tutor_feedback", childId)
  ]);

  return counts.reduce((sum, count) => sum + count, 0);
}

export const POST = withPrivateRoute(async ({ familyId, supabase }, request) => {
  const payload = parseBody(childInputSchema, await request.json());

  const { data, error } = await supabase
    .from("children")
    .insert({ family_id: familyId, ...childColumnValues(payload) })
    .select(childSelectColumns)
    .single();

  if (error) return supabaseError(error);
  return NextResponse.json({ data: mapChildRow(data) }, { status: 201 });
});

export const PUT = withPrivateRoute(async ({ familyId, supabase }, request) => {
  const payload = parseBody(childInputSchema, await request.json());
  const childId = requireQueryParam(request, "childId");

  const { data, error } = await supabase
    .from("children")
    .update(childColumnValues(payload))
    .eq("family_id", familyId)
    .eq("id", childId)
    .select(childSelectColumns)
    .single();

  if (error) return supabaseError(error);
  return NextResponse.json({ data: mapChildRow(data) });
});

export const DELETE = withPrivateRoute(async ({ familyId, supabase }, request) => {
  const childId = requireQueryParam(request, "childId");

  const { count, error: countError } = await supabase
    .from("children")
    .select("id", { count: "exact", head: true })
    .eq("family_id", familyId);

  if (countError) return supabaseError(countError);
  if ((count ?? 0) <= 1) return NextResponse.json({ error: "At least one child profile is required" }, { status: 400 });

  const { data: child, error: childError } = await supabase
    .from("children")
    .select("id")
    .eq("family_id", familyId)
    .eq("id", childId)
    .maybeSingle();

  if (childError) return supabaseError(childError);
  if (!child) return NextResponse.json({ error: "Child profile not found" }, { status: 404 });

  const dependencyCount = await getChildDependencyCount(supabase, childId);
  if (dependencyCount > 0) {
    return NextResponse.json(
      {
        error:
          "This child profile has linked education data and cannot be deleted. Edit the profile instead, or export a backup before manual database maintenance."
      },
      { status: 409 }
    );
  }

  const { error } = await supabase.from("children").delete().eq("family_id", familyId).eq("id", childId);
  if (error) return supabaseError(error);

  return NextResponse.json({ ok: true });
});
