import "../helpers/register-hooks.ts";

import assert from "node:assert/strict";
import test from "node:test";

// Configure private-access env before the modules under test are loaded.
const sessionSecret = "middleware-test-session-secret-at-least-32-chars";
process.env.PRIVATE_SESSION_SECRET = sessionSecret;
process.env.PRIVATE_PARENT_ACCESS_CODE = "parent-code-v1";
process.env.PRIVATE_CAREGIVER_ACCESS_CODE = "caregiver-code-v1";
process.env.PRIVATE_TUTOR_ACCESS_CODE = "tutor-code-v1";
process.env.PRIVATE_VIEWER_ACCESS_CODE = "viewer-code-v1";
process.env.PRIVATE_PARENT_ACCESS_MODE = "closed";

// Loaded dynamically so the module hooks (path aliases, next/server,
// mocked Supabase clients) apply to the whole import graph.
const { middleware } = await import("../../src/middleware.ts");
const { NextRequest } = await import("../../node_modules/next/server.js");
const {
  accessSessionCookieName,
  createAccessSession,
  createTutorInviteToken,
  tutorInviteCookieName
} = await import("../../src/lib/private-access.ts");

type NextRequestType = InstanceType<typeof NextRequest>;

const encoder = new TextEncoder();

async function signSessionPayload(payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(sessionSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Buffer.from(signature).toString("base64url");
}

function buildRequest(path: string, options: { method?: string; cookies?: Record<string, string>; headers?: Record<string, string> } = {}) {
  const headers = new Headers(options.headers ?? {});
  const cookies = Object.entries(options.cookies ?? {});
  if (cookies.length > 0) {
    headers.set("cookie", cookies.map(([name, value]) => `${name}=${value}`).join("; "));
  }
  return new NextRequest(`https://family.example${path}`, { method: options.method ?? "GET", headers }) as NextRequestType;
}

function forwardedHeader(response: Response, name: string) {
  return response.headers.get(`x-middleware-request-${name}`);
}

function isPassThrough(response: Response) {
  return response.headers.get("x-middleware-next") === "1";
}

test("rejects page access without a session cookie by redirecting to /access", async () => {
  const response = await middleware(buildRequest("/"));
  assert.equal(response.status, 307);
  const location = new URL(response.headers.get("location") ?? "");
  assert.equal(location.pathname, "/access");
  assert.equal(location.searchParams.get("next"), "/");
});

test("rejects private API access without a session cookie", async () => {
  const response = await middleware(buildRequest("/api/private/children", { method: "POST" }));
  assert.equal(response.status, 403);
  const body = await response.json();
  assert.match(body.error, /authorized access role/i);
});

test("strips spoofed x-family-* request headers when no valid session exists", async () => {
  const response = await middleware(
    buildRequest("/api/access", {
      method: "POST",
      headers: {
        "x-family-access-role": "parent",
        "x-family-tutor-child-id": "child-1"
      }
    })
  );

  assert.ok(isPassThrough(response));
  assert.equal(forwardedHeader(response, "x-family-access-role"), null);
  assert.equal(forwardedHeader(response, "x-family-tutor-child-id"), null);
  const overridden = response.headers.get("x-middleware-override-headers") ?? "";
  assert.ok(!overridden.split(",").includes("x-family-access-role"));
});

test("rejects an expired session token", async () => {
  const expiredAt = Math.floor(Date.now() / 1000) - 60;
  const payload = `parent.${expiredAt}`;
  const expiredToken = `${payload}.${await signSessionPayload(payload)}`;

  const apiResponse = await middleware(
    buildRequest("/api/private/children", { method: "POST", cookies: { [accessSessionCookieName]: expiredToken } })
  );
  assert.equal(apiResponse.status, 403);

  const pageResponse = await middleware(buildRequest("/", { cookies: { [accessSessionCookieName]: expiredToken } }));
  assert.equal(pageResponse.status, 307);
  assert.equal(new URL(pageResponse.headers.get("location") ?? "").pathname, "/access");
});

test("rejects a session token with a tampered signature", async () => {
  const token = await createAccessSession("parent");
  const tampered = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;

  const response = await middleware(
    buildRequest("/api/private/children", { method: "POST", cookies: { [accessSessionCookieName]: tampered } })
  );
  assert.equal(response.status, 403);
});

test("rejects a session token whose role segment was swapped without re-signing", async () => {
  const token = await createAccessSession("viewer");
  const [, expiresAt, signature] = token.split(".");
  const escalated = `parent.${expiresAt}.${signature}`;

  const response = await middleware(
    buildRequest("/api/private/children", { method: "POST", cookies: { [accessSessionCookieName]: escalated } })
  );
  assert.equal(response.status, 403);
});

test("valid parent session passes pages and private APIs with the role header", async () => {
  const token = await createAccessSession("parent");

  const pageResponse = await middleware(buildRequest("/", { cookies: { [accessSessionCookieName]: token } }));
  assert.ok(isPassThrough(pageResponse));
  assert.equal(forwardedHeader(pageResponse, "x-family-access-role"), "parent");
  assert.equal(forwardedHeader(pageResponse, "x-family-tutor-child-id"), null);

  const apiResponse = await middleware(
    buildRequest("/api/private/children", { method: "POST", cookies: { [accessSessionCookieName]: token } })
  );
  assert.ok(isPassThrough(apiResponse));
  assert.equal(forwardedHeader(apiResponse, "x-family-access-role"), "parent");
});

test("valid caregiver session can write private APIs", async () => {
  const token = await createAccessSession("caregiver");

  for (const [path, method] of [
    ["/api/private/events", "POST"],
    ["/api/private/materials", "PUT"],
    ["/api/private/children", "DELETE"]
  ] as const) {
    const response = await middleware(buildRequest(path, { method, cookies: { [accessSessionCookieName]: token } }));
    assert.ok(isPassThrough(response), `${method} ${path} should pass for caregiver`);
    assert.equal(forwardedHeader(response, "x-family-access-role"), "caregiver");
  }
});

test("valid viewer session is recognized but denied all private API access", async () => {
  const token = await createAccessSession("viewer");

  const accessResponse = await middleware(buildRequest("/api/access", { method: "DELETE", cookies: { [accessSessionCookieName]: token } }));
  assert.ok(isPassThrough(accessResponse));
  assert.equal(forwardedHeader(accessResponse, "x-family-access-role"), "viewer");

  for (const [path, method] of [
    ["/api/private/children", "GET"],
    ["/api/private/children", "POST"],
    ["/api/private/events", "PUT"],
    ["/api/private/materials", "DELETE"]
  ] as const) {
    const response = await middleware(buildRequest(path, { method, cookies: { [accessSessionCookieName]: token } }));
    assert.equal(response.status, 403, `${method} ${path} should be denied for viewer`);
  }

  const pageResponse = await middleware(buildRequest("/", { cookies: { [accessSessionCookieName]: token } }));
  assert.equal(pageResponse.status, 307);
  assert.equal(new URL(pageResponse.headers.get("location") ?? "").pathname, "/access");
});

test("scoped tutor session can only reach tutor-context GET and tutor-feedback POST", async () => {
  const sessionToken = await createAccessSession("tutor");
  const inviteToken = await createTutorInviteToken({ childId: "child-9", tutorName: "王老师", subject: "数学" });
  const cookies = {
    [accessSessionCookieName]: sessionToken,
    [tutorInviteCookieName]: inviteToken
  };

  const contextResponse = await middleware(buildRequest("/api/private/tutor-context", { cookies }));
  assert.ok(isPassThrough(contextResponse));
  assert.equal(forwardedHeader(contextResponse, "x-family-access-role"), "tutor");
  assert.equal(forwardedHeader(contextResponse, "x-family-tutor-child-id"), "child-9");
  assert.equal(forwardedHeader(contextResponse, "x-family-tutor-name"), encodeURIComponent("王老师"));
  assert.equal(forwardedHeader(contextResponse, "x-family-tutor-subject"), encodeURIComponent("数学"));

  const feedbackPost = await middleware(buildRequest("/api/private/tutor-feedback", { method: "POST", cookies }));
  assert.ok(isPassThrough(feedbackPost));
  assert.equal(forwardedHeader(feedbackPost, "x-family-access-role"), "tutor");

  for (const [path, method] of [
    ["/api/private/tutor-feedback", "GET"],
    ["/api/private/tutor-feedback", "PUT"],
    ["/api/private/tutor-feedback", "DELETE"],
    ["/api/private/tutor-context", "POST"],
    ["/api/private/children", "POST"],
    ["/api/private/events", "POST"],
    ["/api/private/materials", "GET"],
    ["/api/private/export", "GET"]
  ] as const) {
    const response = await middleware(buildRequest(path, { method, cookies }));
    assert.equal(response.status, 403, `${method} ${path} should be denied for tutor`);
  }

  const pageResponse = await middleware(buildRequest("/tutor-feedback", { cookies }));
  assert.ok(isPassThrough(pageResponse));
  assert.equal(forwardedHeader(pageResponse, "x-family-access-role"), "tutor");
});

test("tutor session without a scoped invitation cannot use the tutor APIs", async () => {
  const cookies = { [accessSessionCookieName]: await createAccessSession("tutor") };

  const feedbackPost = await middleware(buildRequest("/api/private/tutor-feedback", { method: "POST", cookies }));
  assert.equal(feedbackPost.status, 403);

  const contextGet = await middleware(buildRequest("/api/private/tutor-context", { cookies }));
  assert.equal(contextGet.status, 403);
});

test("tutor invitation cookie alone (no session) does not unlock private APIs", async () => {
  const inviteToken = await createTutorInviteToken({ childId: "child-9", tutorName: "王老师", subject: "数学" });
  const response = await middleware(
    buildRequest("/api/private/tutor-feedback", { method: "POST", cookies: { [tutorInviteCookieName]: inviteToken } })
  );
  assert.equal(response.status, 403);
});
