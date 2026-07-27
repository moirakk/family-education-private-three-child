import { NextResponse } from "next/server";
import {
  assertChildBelongsToFamily,
  getAccessRoleFromRequest,
  getPrivateWriteContext,
  parseBody,
  withPrivateErrorHandling
} from "@/app/api/private/_utils";
import { isPrivateApiDataMode } from "@/lib/family-data-mode";
import { pilotChildren } from "@/lib/pilot-data";
import { createParentInviteToken, createTutorInviteToken } from "@/lib/private-access";
import { tutorShareLinkInputSchema } from "@/lib/schemas/share-link";

function getRequestOrigin(request: Request) {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");

  if (forwardedHost) {
    return `${forwardedProto || url.protocol.replace(":", "")}://${forwardedHost}`;
  }

  return url.origin;
}

export const GET = withPrivateErrorHandling(async (request) => {
  const role = getAccessRoleFromRequest(request);

  if (role === "tutor" || role === "viewer") {
    return NextResponse.json({ error: "Share links are only available to family operators." }, { status: 403 });
  }

  const origin = getRequestOrigin(request);
  const parentInviteToken = await createParentInviteToken();
  return NextResponse.json({
    data: {
      parentUrl: `${origin}/?family=${encodeURIComponent(parentInviteToken)}`,
      tutorFeedbackUrl: null
    }
  });
});

export const POST = withPrivateErrorHandling(async (request) => {
  const role = getAccessRoleFromRequest(request);
  const localMode = !isPrivateApiDataMode();
  // In local/demo mode middleware may not inject a role header (no access
  // codes configured); only enforce the operator gate on a present role.
  if (role ? role !== "parent" && role !== "caregiver" : !localMode) {
    return NextResponse.json({ error: "Tutor links are only available to family operators." }, { status: 403 });
  }

  const payload = parseBody(tutorShareLinkInputSchema, await request.json());
  const childId = payload.childId;
  const tutorName = payload.tutorName;
  const subject = payload.subject;
  if (tutorName.length > 60 || subject.length > 40) {
    return NextResponse.json({ error: "Tutor name or subject is too long." }, { status: 400 });
  }

  if (localMode) {
    // Demo link against the bundled pilot children; no database involved.
    if (!pilotChildren.some((child) => child.id === childId)) {
      return NextResponse.json({ error: "Invalid child for this family." }, { status: 400 });
    }
  } else {
    const { familyId, supabase } = await getPrivateWriteContext(request);
    await assertChildBelongsToFamily(supabase, familyId, childId);
  }

  const inviteToken = await createTutorInviteToken({ childId, tutorName, subject });
  return NextResponse.json({
    data: {
      tutorFeedbackUrl: `${getRequestOrigin(request)}/tutor-feedback?invite=${encodeURIComponent(inviteToken)}`,
      ...(localMode ? { demoMode: true } : {})
    }
  });
});
