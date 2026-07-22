import { NextRequest, NextResponse } from "next/server";
import { accessSessionCookieName, verifyAccessSession } from "@/lib/private-access";

function isConfigured(value: string | undefined) {
  return Boolean(value && value.trim().length > 0);
}

export async function GET(request: NextRequest) {
  const role = await verifyAccessSession(request.cookies.get(accessSessionCookieName)?.value);
  const canViewDiagnostics = role === "parent" || role === "caregiver";

  if (!canViewDiagnostics) {
    return NextResponse.json({ ok: true });
  }

  const configuredDataMode = process.env.NEXT_PUBLIC_FAMILY_DATA_MODE;
  const dataMode =
    configuredDataMode === "local" || configuredDataMode === "private-api" || configuredDataMode === "supabase"
      ? configuredDataMode
      : process.env.NODE_ENV === "production"
        ? "misconfigured"
        : "local";
  const checks = {
    app: true,
    supabaseUrl: isConfigured(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: isConfigured(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabaseServiceRole: isConfigured(process.env.SUPABASE_SERVICE_ROLE_KEY),
    supabaseJwtSecret: isConfigured(process.env.SUPABASE_JWT_SECRET),
    privateFamilyId: isConfigured(process.env.NEXT_PUBLIC_PRIVATE_FAMILY_ID),
    privateParentAccessCode: isConfigured(process.env.PRIVATE_PARENT_ACCESS_CODE) || isConfigured(process.env.PRIVATE_ACCESS_CODE),
    privateCaregiverAccessCode: isConfigured(process.env.PRIVATE_CAREGIVER_ACCESS_CODE),
    privateTutorAccessCode: isConfigured(process.env.PRIVATE_TUTOR_ACCESS_CODE),
    privateViewerAccessCode: isConfigured(process.env.PRIVATE_VIEWER_ACCESS_CODE),
    calendarTokenSource: "family_settings.calendar_token",
    learningMaterialsBucket: isConfigured(process.env.SUPABASE_LEARNING_MATERIALS_BUCKET),
    dataMode
  };

  const readyForPrivateDeploy = Boolean(
    checks.supabaseUrl &&
      checks.supabaseAnonKey &&
      checks.supabaseServiceRole &&
      checks.supabaseJwtSecret &&
      checks.privateFamilyId &&
      checks.privateParentAccessCode &&
      checks.dataMode === "private-api" &&
      checks.learningMaterialsBucket
  );

  return NextResponse.json({
    ok: true,
    readyForPrivateDeploy,
    checks
  });
}
