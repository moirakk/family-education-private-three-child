import { NextResponse } from "next/server";
import { supabaseError, withPrivateRoute } from "@/app/api/private/_utils";

export const GET = withPrivateRoute(async ({ familyId, supabase }, request) => {
  const { data, error } = await supabase
    .from("family_settings")
    .select("calendar_token")
    .eq("family_id", familyId)
    .maybeSingle();

  if (error) return supabaseError(error);
  if (!data?.calendar_token) {
    return NextResponse.json({ error: "Calendar token is not configured." }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const httpsUrl = `${origin}/api/calendar/ios?token=${encodeURIComponent(data.calendar_token)}`;
  const webcalUrl = httpsUrl.replace(/^https?:\/\//, "webcal://");

  return NextResponse.json({
    data: {
      httpsUrl,
      webcalUrl
    }
  });
});
