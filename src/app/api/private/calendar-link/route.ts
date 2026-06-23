import { NextResponse } from "next/server";
import { getPrivateWriteContext, jsonError } from "@/app/api/private/_utils";

export async function GET(request: Request) {
  try {
    const { familyId, supabase } = getPrivateWriteContext();
    const { data, error } = await supabase
      .from("family_settings")
      .select("calendar_token")
      .eq("family_id", familyId)
      .maybeSingle();

    if (error) throw new Error(error.message);
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
  } catch (error) {
    return jsonError(error);
  }
}
