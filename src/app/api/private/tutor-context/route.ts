import { NextResponse } from "next/server";
import { getPrivateWriteContext, jsonError } from "@/app/api/private/_utils";
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

export async function GET() {
  try {
    if (process.env.NEXT_PUBLIC_FAMILY_DATA_MODE !== "private-api") {
      return NextResponse.json({
        data: {
          children: pilotChildren.map((child) => ({
            id: child.id,
            firstName: child.firstName,
            grade: child.grade,
            avatarColor: child.avatarColor
          }))
        }
      });
    }

    const { familyId, supabase } = getPrivateWriteContext();
    const { data, error } = await supabase
      .from("children")
      .select("id,first_name,grade,avatar_color")
      .eq("family_id", familyId)
      .order("created_at");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: { children: (data ?? []).map(mapChild) } });
  } catch (error) {
    return jsonError(error);
  }
}
