import assert from "node:assert/strict";
import test from "node:test";
import { getLocalOnlyItems, mergeRemoteAndLocal } from "../../src/lib/reconciled-collection.ts";

test("keeps remote records as source of truth and preserves only unsynced local items", () => {
  const remote = [
    { id: "db-1", title: "remote event" },
    { id: "db-2", title: "second remote event" }
  ];
  const local = [
    { id: "db-1", title: "stale local copy" },
    { id: "local-1", title: "offline draft" }
  ];

  assert.deepEqual(mergeRemoteAndLocal(remote, local), [
    { id: "db-1", title: "remote event" },
    { id: "db-2", title: "second remote event" },
    { id: "local-1", title: "offline draft" }
  ]);
});

test("filters local-only records by temporary id prefix", () => {
  assert.deepEqual(getLocalOnlyItems([{ id: "db-1" }, { id: "local-record-1" }, { id: "local-event-2" }]), [
    { id: "local-record-1" },
    { id: "local-event-2" }
  ]);
});
