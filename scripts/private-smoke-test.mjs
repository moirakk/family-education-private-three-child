#!/usr/bin/env node

import { loadLocalEnv } from "./private-env.mjs";

loadLocalEnv();

const defaultBaseUrl = "http://127.0.0.1:3000";

function getArgValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasArg(name) {
  return process.argv.includes(name);
}

function isHelp() {
  return hasArg("--help") || hasArg("-h");
}

function usage() {
  console.log("Usage: npm run private:smoke -- --base-url https://your-production-domain [options]");
  console.log("");
  console.log("Options:");
  console.log("- --parent-code <code>       Test private access login and protected dashboard.");
  console.log("- --calendar-token <token>   Test real iOS webcal feed.");
  console.log("- --expect-ready             Require /api/health readyForPrivateDeploy=true.");
  console.log("- --deep-private             Test /api/private/export with the parent session cookie.");
  console.log("");
  console.log("Env fallbacks:");
  console.log("- PRIVATE_SMOKE_BASE_URL");
  console.log("- PRIVATE_PARENT_ACCESS_CODE");
  console.log("- PRIVATE_CALENDAR_TOKEN");
}

function createContext() {
  const baseUrl = new URL(getArgValue("--base-url") || process.env.PRIVATE_SMOKE_BASE_URL || defaultBaseUrl);
  const parentCode = getArgValue("--parent-code") || process.env.PRIVATE_PARENT_ACCESS_CODE || process.env.PRIVATE_ACCESS_CODE || "";
  const calendarToken = getArgValue("--calendar-token") || process.env.PRIVATE_CALENDAR_TOKEN || "";

  return {
    baseUrl: baseUrl.origin,
    parentCode,
    calendarToken,
    expectReady: hasArg("--expect-ready"),
    deepPrivate: hasArg("--deep-private"),
    cookie: ""
  };
}

function url(ctx, pathname) {
  return new URL(pathname, ctx.baseUrl).toString();
}

function statusLabel(ok) {
  return ok ? "ok" : "fail";
}

async function step(name, fn) {
  try {
    const detail = await fn();
    console.log(`PASS ${name}${detail ? `: ${detail}` : ""}`);
    return true;
  } catch (error) {
    console.error(`FAIL ${name}: ${error instanceof Error ? error.message : error}`);
    return false;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function contentType(response) {
  return response.headers.get("content-type") || "";
}

async function fetchText(ctx, pathname, init = {}) {
  const response = await fetch(url(ctx, pathname), {
    redirect: "manual",
    ...init,
    headers: {
      ...(ctx.cookie ? { Cookie: ctx.cookie } : {}),
      ...(init.headers || {})
    }
  });
  const text = await response.text();
  return { response, text };
}

async function fetchJson(ctx, pathname, init = {}) {
  const { response, text } = await fetchText(ctx, pathname, init);
  let json;

  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON but got ${contentType(response) || "unknown content type"}`);
  }

  return { response, json };
}

function collectCookies(response) {
  const getSetCookie = response.headers.getSetCookie?.bind(response.headers);
  const cookies = getSetCookie ? getSetCookie() : [response.headers.get("set-cookie")].filter(Boolean);
  return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

function collectSetCookieHeaders(response) {
  const getSetCookie = response.headers.getSetCookie?.bind(response.headers);
  return getSetCookie ? getSetCookie() : [response.headers.get("set-cookie")].filter(Boolean);
}

async function checkHealth(ctx) {
  const { response, json } = await fetchJson(ctx, "/api/health");
  assert(response.status === 200, `expected 200, got ${response.status}`);
  assert(json.ok === true, "health ok must be true");
  if (!ctx.cookie) return "public ok";
  if (ctx.expectReady) assert(json.readyForPrivateDeploy === true, "readyForPrivateDeploy must be true");
  return `ready=${statusLabel(Boolean(json.readyForPrivateDeploy))}, mode=${json.checks?.dataMode ?? "unknown"}`;
}

async function checkAccessPage(ctx) {
  const { response, text } = await fetchText(ctx, "/access");
  assert(response.status === 200, `expected 200, got ${response.status}`);
  assert(text.includes("Family Education"), "access page should contain product name");
}

async function checkManifest(ctx) {
  const { response, json } = await fetchJson(ctx, "/manifest.webmanifest");
  assert(response.status === 200, `expected 200, got ${response.status}`);
  assert(json.name === "Family Education Management System", "manifest name mismatch");
  assert(json.display === "standalone", "manifest display must be standalone");
  assert(Array.isArray(json.icons) && json.icons.length >= 2, "manifest icons missing");
  return `${json.icons.length} icons`;
}

async function checkOkPath(ctx, pathname, expectedText) {
  const { response, text } = await fetchText(ctx, pathname);
  assert(response.status === 200, `expected 200, got ${response.status}`);
  if (expectedText) assert(text.includes(expectedText), `${pathname} missing expected text`);
  return contentType(response) || "ok";
}

async function checkLogin(ctx) {
  if (!ctx.parentCode) return "skipped; no parent code";

  const body = new URLSearchParams({
    code: ctx.parentCode,
    next: "/"
  });
  const { response } = await fetchText(ctx, "/api/access", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    }
  });

  assert(response.status === 303 || response.status === 307, `expected redirect, got ${response.status}`);
  const location = response.headers.get("location") || "";
  assert(!location.includes(ctx.parentCode), "redirect location leaked access code");
  const setCookieHeaders = collectSetCookieHeaders(response);
  const sessionCookie = setCookieHeaders.find((cookie) => cookie.startsWith("family_private_session=")) || "";
  assert(sessionCookie.includes("HttpOnly"), "private session cookie must be HttpOnly");
  assert(sessionCookie.toLowerCase().includes("samesite=strict"), "private session cookie must use SameSite=Strict");
  const cookie = collectCookies(response);
  assert(cookie.includes("family_private_session="), "private session cookie missing");
  ctx.cookie = cookie;
  return "session cookie issued";
}

async function checkProtectedDashboard(ctx) {
  if (!ctx.parentCode) return "skipped; no parent code";
  const { response, text } = await fetchText(ctx, "/");
  assert(response.status === 200, `expected 200, got ${response.status}`);
  assert(text.includes("Family Education Management System"), "dashboard did not render expected title");
}

async function checkUnauthenticatedPrivateApi(ctx) {
  const originalCookie = ctx.cookie;
  ctx.cookie = "";

  try {
    const { response } = await fetchText(ctx, "/api/private/export");
    assert(response.status === 403, `expected 403, got ${response.status}`);
    return "private API rejects missing session";
  } finally {
    ctx.cookie = originalCookie;
  }
}

async function checkTutorBoundaries(ctx) {
  if (!ctx.parentCode || !ctx.cookie) return "skipped; no parent session";

  const originalCookie = ctx.cookie;
  const snapshotResult = await fetchJson(ctx, "/api/private/snapshot");
  const child = snapshotResult.json.data?.children?.[0];
  assert(child?.id, "snapshot must contain a child for tutor link generation");

  const linkResult = await fetchJson(ctx, "/api/private/share-links", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ childId: child.id, tutorName: "Smoke Test Tutor", subject: "数学" })
  });
  assert(linkResult.response.status === 200, `tutor link expected 200, got ${linkResult.response.status}`);
  const tutorUrl = linkResult.json.data?.tutorFeedbackUrl;
  assert(typeof tutorUrl === "string" && tutorUrl.includes("/tutor-feedback?invite="), "scoped tutor link missing");

  ctx.cookie = "";
  const { response: inviteResponse } = await fetchText(ctx, tutorUrl);
  assert(inviteResponse.status === 307 || inviteResponse.status === 308, `tutor invite expected redirect, got ${inviteResponse.status}`);
  const tutorCookie = collectCookies(inviteResponse);
  assert(tutorCookie.includes("family_private_session="), "tutor session cookie missing");
  assert(tutorCookie.includes("family_tutor_invite="), "tutor scope cookie missing");
  ctx.cookie = tutorCookie;

  try {
    const contextResult = await fetchJson(ctx, "/api/private/tutor-context");
    assert(contextResult.response.status === 200, `tutor context expected 200, got ${contextResult.response.status}`);
    assert(contextResult.json.data?.children?.length === 1, "tutor context must return exactly one child");
    assert(contextResult.json.data?.children?.[0]?.id === child.id, "tutor context child scope mismatch");
    assert(contextResult.json.data?.tutorScope?.subject === "数学", "tutor context subject scope mismatch");

    const feedbackResult = await fetchText(ctx, "/api/private/tutor-feedback");
    assert(feedbackResult.response.status === 403, `tutor GET feedback expected 403, got ${feedbackResult.response.status}`);

    const exportResult = await fetchText(ctx, "/api/private/export");
    assert(exportResult.response.status === 403, `tutor export expected 403, got ${exportResult.response.status}`);

    return "scoped context allowed; feedback list/export denied";
  } finally {
    ctx.cookie = originalCookie;
  }
}

async function checkCalendarWithSession(ctx) {
  if (!ctx.parentCode) return "skipped; no parent code";
  const { response, text } = await fetchText(ctx, "/api/calendar/ios?download=1");
  assert(response.status === 200, `expected 200, got ${response.status}`);
  assert(text.includes("BEGIN:VCALENDAR"), "calendar response missing BEGIN:VCALENDAR");
  return contentType(response);
}

async function checkUnauthenticatedCalendar(ctx) {
  if (process.env.NEXT_PUBLIC_FAMILY_DATA_MODE !== "private-api") return "skipped; not private-api mode";
  const originalCookie = ctx.cookie;
  ctx.cookie = "";

  try {
    const { response, text } = await fetchText(ctx, "/api/calendar/ios");
    assert(response.status === 401, `expected 401, got ${response.status}`);
    assert(!text.includes("BEGIN:VCALENDAR"), "unauthenticated calendar should not return ICS");
    return "calendar requires token or session";
  } finally {
    ctx.cookie = originalCookie;
  }
}

async function checkCalendarToken(ctx) {
  if (!ctx.calendarToken) return "skipped; no calendar token";
  const { response, text } = await fetchText(ctx, `/api/calendar/ios?token=${encodeURIComponent(ctx.calendarToken)}`);
  assert(response.status === 200, `expected 200, got ${response.status}`);
  assert(text.includes("BEGIN:VCALENDAR"), "calendar token response missing BEGIN:VCALENDAR");
  return contentType(response);
}

async function checkPrivateExport(ctx) {
  if (!ctx.deepPrivate) return "skipped; pass --deep-private";
  if (!ctx.parentCode) return "skipped; no parent code";
  const { response, json } = await fetchJson(ctx, "/api/private/export");
  assert(response.status === 200, `expected 200, got ${response.status}`);
  assert(json.data?.source === "supabase-private-api", "export source mismatch");
  assert(json.data?.tables, "export tables missing");
  return `${Object.keys(json.data.tables).length} tables`;
}

async function main() {
  if (isHelp()) {
    usage();
    return;
  }

  const ctx = createContext();
  console.log(`Private deployment smoke test: ${ctx.baseUrl}`);

  const results = [];
  results.push(await step("health", () => checkHealth(ctx)));
  results.push(await step("access page", () => checkAccessPage(ctx)));
  results.push(await step("manifest", () => checkManifest(ctx)));
  results.push(await step("icon", () => checkOkPath(ctx, "/icon")));
  results.push(await step("apple icon", () => checkOkPath(ctx, "/apple-icon")));
  results.push(await step("service worker", () => checkOkPath(ctx, "/sw.js", "CACHE_NAME")));
  results.push(await step("offline page", () => checkOkPath(ctx, "/offline.html", "离线")));
  results.push(await step("private access login", () => checkLogin(ctx)));
  results.push(await step("authenticated health", () => checkHealth(ctx)));
  results.push(await step("unauthenticated private API", () => checkUnauthenticatedPrivateApi(ctx)));
  results.push(await step("protected dashboard", () => checkProtectedDashboard(ctx)));
  results.push(await step("tutor access boundaries", () => checkTutorBoundaries(ctx)));
  results.push(await step("unauthenticated calendar", () => checkUnauthenticatedCalendar(ctx)));
  results.push(await step("calendar with session", () => checkCalendarWithSession(ctx)));
  results.push(await step("calendar token", () => checkCalendarToken(ctx)));
  results.push(await step("private export", () => checkPrivateExport(ctx)));

  const failed = results.filter((result) => !result).length;
  console.log("");
  console.log(failed === 0 ? "Smoke test passed." : `Smoke test failed: ${failed} check(s).`);
  process.exitCode = failed === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
