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
    privateAccessCode: isConfigured(process.env.PRIVATE_ACCESS_CODE),
    privateCalendarToken: isConfigured(process.env.PRIVATE_CALENDAR_TOKEN),
    learningMaterialsBucket: isConfigured(process.env.SUPABASE_LEARNING_MATERIALS_BUCKET),
    dataMode: process.env.NEXT_PUBLIC_FAMILY_DATA_MODE ?? "local"
  };

  const readyForPrivateDeploy = Boolean(
    checks.supabaseUrl &&
      checks.supabaseAnonKey &&
      checks.supabaseServiceRole &&
      checks.privateFamilyId &&
      checks.privateAccessCode &&
      checks.privateCalendarToken &&
      checks.learningMaterialsBucket
  );

  return NextResponse.json({
    ok: true,
    readyForPrivateDeploy,
    checks
  });
}
