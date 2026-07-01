import assert from "node:assert/strict";
import test from "node:test";
import { getEventUrgency, sortEventsByUrgency } from "../../src/lib/urgency.ts";

const today = new Date("2026-07-01T00:00:00+09:00");

test("classifies events by date distance and exam priority", () => {
  assert.equal(getEventUrgency({ category: "exam", startsAt: "2026-07-02T09:00:00+09:00" }, today), "critical");
  assert.equal(getEventUrgency({ category: "school", startsAt: "2026-07-05T09:00:00+09:00" }, today), "warning");
  assert.equal(getEventUrgency({ category: "activity", startsAt: "2026-07-20T09:00:00+09:00" }, today), "ok");
  assert.equal(getEventUrgency({ category: "family", startsAt: "2026-06-30T09:00:00+09:00" }, today), "past");
});

test("sorts by urgency first and then by start time", () => {
  const sorted = sortEventsByUrgency([
    { id: "ok", category: "activity" as const, startsAt: "2026-07-20T09:00:00+09:00" },
    { id: "critical-later", category: "exam" as const, startsAt: "2026-07-02T12:00:00+09:00" },
    { id: "critical-earlier", category: "exam" as const, startsAt: "2026-07-02T09:00:00+09:00" },
    { id: "warning", category: "school" as const, startsAt: "2026-07-05T09:00:00+09:00" }
  ]);

  assert.deepEqual(sorted.map((event) => event.id), ["critical-earlier", "critical-later", "warning", "ok"]);
});
