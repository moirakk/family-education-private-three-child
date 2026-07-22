import { NextResponse } from "next/server";
import { assertChildBelongsToFamily, getPrivateWriteContext, jsonError, parseBody } from "@/app/api/private/_utils";
import { intakeInputSchema } from "@/lib/schemas/intake";

export async function PUT(request: Request) {
  try {
    const { familyId, supabase } = await getPrivateWriteContext(request);
    const payload = parseBody(intakeInputSchema, await request.json());
    const childId = payload.childId;

    await assertChildBelongsToFamily(supabase, familyId, childId);

    const { data, error } = await supabase
      .from("child_intake_profiles")
      .upsert({
        child_id: childId,
        school_detail: payload.schoolDetail ?? "",
        weekly_schedule: payload.weeklySchedule ?? "",
        important_dates: payload.importantDates ?? "",
        current_goals: payload.currentGoals ?? "",
        parent_concerns: payload.parentConcerns ?? "",
        private_notes: payload.privateNotes ?? "",
        updated_at: new Date().toISOString()
      })
      .select("child_id,school_detail,weekly_schedule,important_dates,current_goals,parent_concerns,private_notes,updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
