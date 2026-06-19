import { NextResponse } from "next/server";
import { assertPrivateWriteConfigured, getSupabaseAdminClient } from "@/lib/supabase-admin";

type IntakePayload = {
  childId?: string;
  schoolDetail?: string;
  weeklySchedule?: string;
  importantDates?: string;
  currentGoals?: string;
  parentConcerns?: string;
  privateNotes?: string;
};

export async function PUT(request: Request) {
  try {
    assertPrivateWriteConfigured();
    const payload = (await request.json()) as IntakePayload;

    if (!payload.childId) {
      return NextResponse.json({ error: "childId is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("child_intake_profiles")
      .upsert({
        child_id: payload.childId,
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
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
