import { NextResponse } from "next/server";
import {
  assertChildBelongsToFamily,
  getAccessRoleFromRequest,
  getPrivateWriteContext,
  jsonError,
  requireString
} from "@/app/api/private/_utils";
import { createParentInviteToken, createTutorInviteToken } from "@/lib/private-access";

function getRequestOrigin(request: Request) {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");

  if (forwardedHost) {
    return `${forwardedProto || url.protocol.replace(":", "")}://${forwardedHost}`;
  }

  return url.origin;
}

export async function GET(request: Request) {
  try {
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
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const role = getAccessRoleFromRequest(request);
    if (role !== "parent" && role !== "caregiver") {
      return NextResponse.json({ error: "Tutor links are only available to family operators." }, { status: 403 });
    }

    const payload = (await request.json()) as { childId?: string; tutorName?: string; subject?: string };
    const childId = requireString(payload.childId, "childId");
    const tutorName = requireString(payload.tutorName, "tutorName");
    const subject = requireString(payload.subject, "subject");
    if (tutorName.length > 60 || subject.length > 40) {
      return NextResponse.json({ error: "Tutor name or subject is too long." }, { status: 400 });
    }

    const { familyId, supabase } = getPrivateWriteContext();
    await assertChildBelongsToFamily(supabase, familyId, childId);

    const inviteToken = await createTutorInviteToken({ childId, tutorName, subject });
    return NextResponse.json({
      data: {
        tutorFeedbackUrl: `${getRequestOrigin(request)}/tutor-feedback?invite=${encodeURIComponent(inviteToken)}`
      }
    });
  } catch (error) {
    return jsonError(error, error instanceof Error && error.message.includes("required") ? 400 : 500);
  }
}
