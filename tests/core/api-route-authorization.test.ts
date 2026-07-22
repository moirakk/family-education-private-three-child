import "../helpers/register-hooks.ts";

import assert from "node:assert/strict";
import test from "node:test";
import type { AccessRole } from "../../src/lib/private-access.ts";

// Configure env before the modules under test are loaded.
process.env.PRIVATE_SESSION_SECRET = "api-route-test-session-secret-at-least-32chars";
process.env.PRIVATE_PARENT_ACCESS_CODE = "parent-code-v1";
process.env.PRIVATE_CAREGIVER_ACCESS_CODE = "caregiver-code-v1";
process.env.PRIVATE_TUTOR_ACCESS_CODE = "tutor-code-v1";
process.env.PRIVATE_VIEWER_ACCESS_CODE = "viewer-code-v1";
process.env.PRIVATE_PARENT_ACCESS_MODE = "closed";
process.env.NEXT_PUBLIC_PRIVATE_FAMILY_ID = "family-test-1";

const familyId = "family-test-1";
const familyChildIds = ["child-1", "child-2", "child-3"];

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
const {
  resetMockSupabase,
  setQueryHandler,
  supabaseClientRecords
} = await import("../helpers/mock-supabase-user-context.ts");
const childrenRoute = await import("../../src/app/api/private/children/route.ts");
const eventsRoute = await import("../../src/app/api/private/events/route.ts");
const tutorFeedbackRoute = await import("../../src/app/api/private/tutor-feedback/route.ts");
const materialsRoute = await import("../../src/app/api/private/materials/route.ts");

type QueryCall = import("../helpers/mock-supabase.ts").QueryCall;

function filterValue(call: QueryCall, method: string, column?: string) {
  const match = call.filters.find(
    (filter) => filter.method === method && (column === undefined || filter.args[0] === column)
  );
  return match?.args[column === undefined ? 0 : 1];
}

/**
 * In-memory stand-in for the family database: children lookups honor the
 * fixed `familyChildIds` set, and inserts/updates echo the row back the way
 * PostgREST would.
 */
function familyDataHandler(call: QueryCall) {
  const nowIso = new Date().toISOString();

  if (call.table === "children") {
    if (call.action === "select") {
      if (call.head) return { count: familyChildIds.length };

      const requestedIds = filterValue(call, "in", "id") as string[] | undefined;
      if (requestedIds) {
        return { data: requestedIds.filter((id) => familyChildIds.includes(id)).map((id) => ({ id })) };
      }

      const requestedId = filterValue(call, "eq", "id") as string | undefined;
      if (requestedId !== undefined) {
        return familyChildIds.includes(requestedId) ? { data: { id: requestedId } } : { data: null };
      }

      return { data: familyChildIds.map((id) => ({ id })) };
    }

    if (call.action === "insert" || call.action === "update") {
      const values = call.values as Record<string, unknown>;
      return {
        data: {
          id: call.action === "insert" ? "child-new" : filterValue(call, "eq", "id"),
          last_name: null,
          age: null,
          grade: null,
          school_name: null,
          school_program: null,
          ...values
        }
      };
    }

    return { data: null };
  }

  if (call.action === "insert" || call.action === "update" || call.action === "upsert") {
    if (call.table === "calendar_event_children") return { data: null };
    const values = call.values as Record<string, unknown>;
    return {
      data: {
        id: `${call.table}-row-1`,
        created_at: nowIso,
        updated_at: nowIso,
        ...values
      }
    };
  }

  return undefined;
}

async function roleCookies(role: AccessRole, tutorChildId?: string) {
  const cookies: Record<string, string> = {
    [accessSessionCookieName]: await createAccessSession(role)
  };

  if (role === "tutor" && tutorChildId) {
    cookies[tutorInviteCookieName] = await createTutorInviteToken({
      childId: tutorChildId,
      tutorName: "王老师",
      subject: "数学"
    });
  }

  return cookies;
}

function extractForwardedHeaders(middlewareResponse: Response) {
  const headers = new Headers();
  const overridden = middlewareResponse.headers.get("x-middleware-override-headers");

  for (const name of overridden ? overridden.split(",") : []) {
    const value = middlewareResponse.headers.get(`x-middleware-request-${name}`);
    if (value !== null) headers.set(name, value);
  }

  return headers;
}

type RouteHandler = (request: Request) => Promise<Response>;

/**
 * Simulates the real authorization pipeline: the request first passes
 * through middleware (cookie verification + x-family-* header injection),
 * and only a middleware pass-through reaches the route handler.
 */
async function callThroughMiddleware(
  handler: RouteHandler,
  path: string,
  options: { method?: string; cookies?: Record<string, string>; body?: unknown } = {}
) {
  const method = options.method ?? "GET";
  const url = `https://family.example${path}`;
  const middlewareHeaders = new Headers();
  const cookies = Object.entries(options.cookies ?? {});
  if (cookies.length > 0) {
    middlewareHeaders.set("cookie", cookies.map(([name, value]) => `${name}=${value}`).join("; "));
  }

  const middlewareResponse = await middleware(new NextRequest(url, { method, headers: middlewareHeaders }));
  if (middlewareResponse.headers.get("x-middleware-next") !== "1") {
    return middlewareResponse as Response;
  }

  const routeHeaders = extractForwardedHeaders(middlewareResponse);
  let body: string | undefined;
  if (options.body !== undefined) {
    body = JSON.stringify(options.body);
    routeHeaders.set("content-type", "application/json");
  }

  return handler(new Request(url, { method, headers: routeHeaders, body }));
}

function lastSupabaseClient() {
  const record = supabaseClientRecords.at(-1);
  assert.ok(record, "expected a Supabase client to have been created");
  return record;
}

test.beforeEach(() => {
  resetMockSupabase();
  setQueryHandler(familyDataHandler);
});

const childBody = { firstName: "小明", grade: "三年级" };
const eventBody = {
  title: "数学辅导",
  category: "tutoring",
  startsAt: "2026-08-01T10:00:00+08:00",
  childIds: ["child-1", "child-2"]
};
const materialBody = { title: "练习册", subject: "数学", childId: "child-1", kind: "worksheet" };
const feedbackBody = { focus: "分数运算", childId: "child-1", tutorName: "李老师", subject: "英语", rating: 4 };

// --- children CRUD -------------------------------------------------------

test("children: parent can create, update, and delete", async () => {
  const cookies = await roleCookies("parent");

  const createResponse = await callThroughMiddleware(childrenRoute.POST, "/api/private/children", {
    method: "POST",
    cookies,
    body: childBody
  });
  assert.equal(createResponse.status, 201);
  const created = await createResponse.json();
  assert.equal(created.data.firstName, "小明");

  const client = lastSupabaseClient();
  assert.deepEqual(client.claims, { familyId, accessRole: "parent", tutorChildId: undefined });
  const insert = client.queries.find((query) => query.table === "children" && query.action === "insert");
  assert.ok(insert, "expected an insert into children");
  assert.equal((insert.values as { family_id: string }).family_id, familyId);

  const updateResponse = await callThroughMiddleware(childrenRoute.PUT, "/api/private/children?childId=child-2", {
    method: "PUT",
    cookies,
    body: childBody
  });
  assert.equal(updateResponse.status, 200);
  const updateQuery = lastSupabaseClient().queries.find((query) => query.action === "update");
  assert.ok(updateQuery);
  assert.equal(filterValue(updateQuery, "eq", "family_id"), familyId);
  assert.equal(filterValue(updateQuery, "eq", "id"), "child-2");

  const deleteResponse = await callThroughMiddleware(childrenRoute.DELETE, "/api/private/children?childId=child-3", {
    method: "DELETE",
    cookies
  });
  assert.equal(deleteResponse.status, 200);
  assert.deepEqual(await deleteResponse.json(), { ok: true });
});

test("children: viewer is denied every write", async () => {
  const cookies = await roleCookies("viewer");

  for (const [handler, method, path] of [
    [childrenRoute.POST, "POST", "/api/private/children"],
    [childrenRoute.PUT, "PUT", "/api/private/children?childId=child-1"],
    [childrenRoute.DELETE, "DELETE", "/api/private/children?childId=child-1"]
  ] as const) {
    const response = await callThroughMiddleware(handler, path, { method, cookies, body: childBody });
    assert.equal(response.status, 403, `viewer ${method} should be denied`);
  }

  assert.equal(supabaseClientRecords.length, 0, "no Supabase client should ever be created for a denied viewer");
});

test("children: scoped tutor cannot touch child profiles", async () => {
  const cookies = await roleCookies("tutor", "child-1");

  for (const [handler, method] of [
    [childrenRoute.POST, "POST"],
    [childrenRoute.PUT, "PUT"],
    [childrenRoute.DELETE, "DELETE"]
  ] as const) {
    const response = await callThroughMiddleware(handler, "/api/private/children?childId=child-1", {
      method,
      cookies,
      body: childBody
    });
    assert.equal(response.status, 403, `tutor ${method} should be denied`);
  }

  assert.equal(supabaseClientRecords.length, 0);
});

// --- events CRUD ---------------------------------------------------------

test("events: parent and caregiver can create, update, and delete", async () => {
  for (const role of ["parent", "caregiver"] as const) {
    const cookies = await roleCookies(role);

    const createResponse = await callThroughMiddleware(eventsRoute.POST, "/api/private/events", {
      method: "POST",
      cookies,
      body: eventBody
    });
    assert.equal(createResponse.status, 201, `${role} should create events`);
    const client = lastSupabaseClient();
    assert.equal(client.claims.accessRole, role);
    const linkInsert = client.queries.find((query) => query.table === "calendar_event_children" && query.action === "insert");
    assert.ok(linkInsert, "expected child links to be inserted");
    assert.deepEqual(
      (linkInsert.values as { child_id: string }[]).map((row) => row.child_id),
      ["child-1", "child-2"]
    );

    const updateResponse = await callThroughMiddleware(eventsRoute.PUT, "/api/private/events?eventId=event-1", {
      method: "PUT",
      cookies,
      body: eventBody
    });
    assert.equal(updateResponse.status, 200, `${role} should update events`);

    const deleteResponse = await callThroughMiddleware(eventsRoute.DELETE, "/api/private/events?eventId=event-1", {
      method: "DELETE",
      cookies
    });
    assert.equal(deleteResponse.status, 200, `${role} should delete events`);
    const deleteQuery = lastSupabaseClient().queries.find((query) => query.action === "delete");
    assert.ok(deleteQuery);
    assert.equal(filterValue(deleteQuery, "eq", "family_id"), familyId);
  }
});

test("events: rejects children that do not belong to the family", async () => {
  const cookies = await roleCookies("parent");
  const response = await callThroughMiddleware(eventsRoute.POST, "/api/private/events", {
    method: "POST",
    cookies,
    body: { ...eventBody, childIds: ["child-1", "intruder-child"] }
  });

  assert.ok(response.status >= 400, "foreign child ids must be rejected");
  const body = await response.json();
  assert.match(body.error, /do not belong/i);
  const eventInsert = lastSupabaseClient().queries.find((query) => query.table === "calendar_events");
  assert.equal(eventInsert, undefined, "no event row should be written");
});

test("events: tutor and viewer cannot write", async () => {
  for (const cookies of [await roleCookies("tutor", "child-1"), await roleCookies("viewer")]) {
    const response = await callThroughMiddleware(eventsRoute.POST, "/api/private/events", {
      method: "POST",
      cookies,
      body: eventBody
    });
    assert.equal(response.status, 403);
  }

  assert.equal(supabaseClientRecords.length, 0);
});

// --- tutor-feedback ------------------------------------------------------

test("tutor-feedback: scoped tutor POST is forced onto the invited child", async () => {
  const cookies = await roleCookies("tutor", "child-2");

  const response = await callThroughMiddleware(tutorFeedbackRoute.POST, "/api/private/tutor-feedback", {
    method: "POST",
    cookies,
    // The body tries to spoof another child, tutor name, and subject.
    body: { ...feedbackBody, childId: "child-1", tutorName: "假老师", subject: "物理" }
  });

  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.data.childId, "child-2");
  assert.equal(body.data.tutorName, "王老师");
  assert.equal(body.data.subject, "数学");

  const client = lastSupabaseClient();
  assert.equal(client.claims.accessRole, "tutor");
  assert.equal(client.claims.tutorChildId, "child-2", "RLS claims must carry the invited child");
  const insert = client.queries.find((query) => query.table === "tutor_feedback" && query.action === "insert");
  assert.ok(insert);
  assert.equal((insert.values as { child_id: string }).child_id, "child-2");
});

test("tutor-feedback: tutor role without a scoped invitation is rejected by the route itself", async () => {
  // Bypass middleware on purpose: even if a tutor role header reached the
  // route without scope headers, the route must refuse to write.
  const response = await tutorFeedbackRoute.POST(
    new Request("https://family.example/api/private/tutor-feedback", {
      method: "POST",
      headers: { "x-family-access-role": "tutor", "content-type": "application/json" },
      body: JSON.stringify(feedbackBody)
    })
  );

  assert.equal(response.status, 403);
  const body = await response.json();
  assert.match(body.error, /scoped tutor invitation/i);
});

test("tutor-feedback: tutor cannot read, update, or delete feedback", async () => {
  const cookies = await roleCookies("tutor", "child-2");

  for (const [handler, method, path] of [
    [tutorFeedbackRoute.GET, "GET", "/api/private/tutor-feedback"],
    [tutorFeedbackRoute.PUT, "PUT", "/api/private/tutor-feedback?feedbackId=feedback-1"],
    [tutorFeedbackRoute.DELETE, "DELETE", "/api/private/tutor-feedback?feedbackId=feedback-1"]
  ] as const) {
    const response = await callThroughMiddleware(handler, path, {
      method,
      cookies,
      body: method === "GET" ? undefined : feedbackBody
    });
    assert.equal(response.status, 403, `tutor ${method} should be denied`);
  }

  assert.equal(supabaseClientRecords.length, 0);
});

test("tutor-feedback: parent can POST for any child in the family", async () => {
  const cookies = await roleCookies("parent");

  const response = await callThroughMiddleware(tutorFeedbackRoute.POST, "/api/private/tutor-feedback", {
    method: "POST",
    cookies,
    body: feedbackBody
  });

  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.data.childId, "child-1");
  assert.equal(body.data.tutorName, "李老师");
  assert.equal(lastSupabaseClient().claims.tutorChildId, undefined);
});

// --- materials -----------------------------------------------------------

test("materials: parent and caregiver pass permission checks for reads and writes", async () => {
  for (const role of ["parent", "caregiver"] as const) {
    const cookies = await roleCookies(role);

    const listResponse = await callThroughMiddleware(materialsRoute.GET, "/api/private/materials", { cookies });
    assert.equal(listResponse.status, 200, `${role} should list materials`);
    const listQuery = lastSupabaseClient().queries.find((query) => query.table === "learning_materials");
    assert.ok(listQuery);
    assert.equal(filterValue(listQuery, "eq", "family_id"), familyId, "reads must stay family-scoped");

    const createResponse = await callThroughMiddleware(materialsRoute.POST, "/api/private/materials", {
      method: "POST",
      cookies,
      body: materialBody
    });
    assert.equal(createResponse.status, 201, `${role} should create materials`);
    assert.equal(lastSupabaseClient().claims.accessRole, role);

    const updateResponse = await callThroughMiddleware(materialsRoute.PUT, "/api/private/materials?materialId=material-1", {
      method: "PUT",
      cookies,
      body: materialBody
    });
    assert.equal(updateResponse.status, 200, `${role} should update materials`);

    const deleteResponse = await callThroughMiddleware(materialsRoute.DELETE, "/api/private/materials?materialId=material-1", {
      method: "DELETE",
      cookies
    });
    assert.equal(deleteResponse.status, 200, `${role} should delete materials`);
  }
});

test("materials: viewer and tutor are denied", async () => {
  for (const cookies of [await roleCookies("viewer"), await roleCookies("tutor", "child-1")]) {
    for (const [handler, method, path] of [
      [materialsRoute.GET, "GET", "/api/private/materials"],
      [materialsRoute.POST, "POST", "/api/private/materials"],
      [materialsRoute.PUT, "PUT", "/api/private/materials?materialId=material-1"],
      [materialsRoute.DELETE, "DELETE", "/api/private/materials?materialId=material-1"]
    ] as const) {
      const response = await callThroughMiddleware(handler, path, {
        method,
        cookies,
        body: method === "GET" || method === "DELETE" ? undefined : materialBody
      });
      assert.equal(response.status, 403, `${method} ${path} should be denied`);
    }
  }

  assert.equal(supabaseClientRecords.length, 0);
});

test("materials: rejects a childId outside the family", async () => {
  const cookies = await roleCookies("parent");
  const response = await callThroughMiddleware(materialsRoute.POST, "/api/private/materials", {
    method: "POST",
    cookies,
    body: { ...materialBody, childId: "intruder-child" }
  });

  assert.ok(response.status >= 400, "foreign childId must be rejected");
  const body = await response.json();
  assert.match(body.error, /invalid child/i);
  const materialInsert = lastSupabaseClient().queries.find((query) => query.table === "learning_materials");
  assert.equal(materialInsert, undefined, "no material row should be written");
});
