import { NextResponse } from "next/server";

function isConfigured(value: string | undefined) {
  return Boolean(value && value.trim().length > 0);
}

export async function GET() {
  const checks = {
    app: true,
    supabaseUrl: isConfigured(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: isConfigured(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabaseServiceRole: isConfigured(process.env.SUPABASE_SERVICE_ROLE_KEY),
    privateFamilyId: isConfigured(process.env.NEXT_PUBLIC_PRIVATE_FAMILY_ID),
    privateParentAccessCode: isConfigured(process.env.PRIVATE_PARENT_ACCESS_CODE) || isConfigured(process.env.PRIVATE_ACCESS_CODE),
    privateCaregiverAccessCode: isConfigured(process.env.PRIVATE_CAREGIVER_ACCESS_CODE),
    privateTutorAccessCode: isConfigured(process.env.PRIVATE_TUTOR_ACCESS_CODE),
    privateViewerAccessCode: isConfigured(process.env.PRIVATE_VIEWER_ACCESS_CODE),
    calendarTokenSource: "family_settings.calendar_token",
    learningMaterialsBucket: isConfigured(process.env.SUPABASE_LEARNING_MATERIALS_BUCKET),
    dataMode: process.env.NEXT_PUBLIC_FAMILY_DATA_MODE ?? "local"
  };

  const readyForPrivateDeploy = Boolean(
    checks.supabaseUrl &&
      checks.supabaseAnonKey &&
      checks.supabaseServiceRole &&
      checks.privateFamilyId &&
      checks.privateParentAccessCode &&
      checks.learningMaterialsBucket
  );

  return NextResponse.json({
    ok: true,
    readyForPrivateDeploy,
    checks
  });
}
