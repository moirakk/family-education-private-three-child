import { NextResponse } from "next/server";
import { getAccessRoleFromRequest, jsonError } from "@/app/api/private/_utils";

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
    const tutorCode = process.env.PRIVATE_TUTOR_ACCESS_CODE;

    return NextResponse.json({
      data: {
        parentUrl: `${origin}/`,
        tutorFeedbackUrl: tutorCode ? `${origin}/tutor-feedback?code=${encodeURIComponent(tutorCode)}` : null
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
