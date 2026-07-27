import { NextResponse } from "next/server";
import {
  getAccessRoleFromRequest,
  getPrivateWriteContext,
  getTutorInviteScopeFromRequest,
  supabaseError,
  withPrivateErrorHandling
} from "@/app/api/private/_utils";
import { isPrivateApiDataMode } from "@/lib/family-data-mode";
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

export const GET = withPrivateErrorHandling(async (request) => {
  const role = getAccessRoleFromRequest(request);
  const tutorScope = getTutorInviteScopeFromRequest(request);
  if (role === "tutor" && !tutorScope) {
    return NextResponse.json({ error: "A scoped tutor invitation is required." }, { status: 403 });
  }

  if (!isPrivateApiDataMode()) {
    // Local/demo mode (any NODE_ENV): serve the bundled pilot data so the
    // tutor flow stays usable without a database.
    return NextResponse.json({
      data: {
        children: pilotChildren
          .filter((child) => !tutorScope || child.id === tutorScope.childId)
          .map((child) => ({
            id: child.id,
            firstName: child.firstName,
            grade: child.grade,
            avatarColor: child.avatarColor
          })),
        tutorScope
      }
    });
  }

  const { familyId, supabase } = await getPrivateWriteContext(request);
  let query = supabase
    .from("children")
    .select("id,first_name,grade,avatar_color")
    .eq("family_id", familyId)
    .order("created_at");
  if (tutorScope) query = query.eq("id", tutorScope.childId);

  const { data, error } = await query;

  if (error) return supabaseError(error);
  if (tutorScope && (data ?? []).length !== 1) {
    return NextResponse.json({ error: "This tutor invitation no longer matches an active child." }, { status: 403 });
  }
  return NextResponse.json({ data: { children: (data ?? []).map(mapChild), tutorScope } });
});
