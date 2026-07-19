import { NextResponse } from "next/server";
import { getAccessRoleFromRequest, getPrivateWriteContext, getTutorInviteScopeFromRequest, jsonError } from "@/app/api/private/_utils";
import { pilotChildren } from "@/lib/pilot-data";

function mapChild(row: {
  id: string;
  first_name: string;
  grade: string | null;
  avatar_color: string;
}) {
  return {
    id: row.id,
    firstName: row.first_name,
    grade: row.grade ?? "",
    avatarColor: row.avatar_color
  };
}

export async function GET(request: Request) {
  try {
    const role = getAccessRoleFromRequest(request);
    const tutorScope = getTutorInviteScopeFromRequest(request);
    if (role === "tutor" && !tutorScope) {
      return NextResponse.json({ error: "A scoped tutor invitation is required." }, { status: 403 });
    }

    if (process.env.NEXT_PUBLIC_FAMILY_DATA_MODE !== "private-api") {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "NEXT_PUBLIC_FAMILY_DATA_MODE must be private-api in production." }, { status: 500 });
      }

      return NextResponse.json({
        data: {
          children: pilotChildren.map((child) => ({
            id: child.id,
            firstName: child.firstName,
            grade: child.grade,
            avatarColor: child.avatarColor
          })),
          tutorScope
        }
      });
    }

    const { familyId, supabase } = getPrivateWriteContext();
    let query = supabase
      .from("children")
      .select("id,first_name,grade,avatar_color")
      .eq("family_id", familyId)
      .order("created_at");
    if (tutorScope) query = query.eq("id", tutorScope.childId);

    const { data, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (tutorScope && (data ?? []).length !== 1) {
      return NextResponse.json({ error: "This tutor invitation no longer matches an active child." }, { status: 403 });
    }
    return NextResponse.json({ data: { children: (data ?? []).map(mapChild), tutorScope } });
  } catch (error) {
    return jsonError(error);
  }
}
