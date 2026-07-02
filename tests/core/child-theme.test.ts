import assert from "node:assert/strict";
import test from "node:test";
import { getChildTheme } from "../../src/lib/child-theme.ts";

test("derives child theme styles from avatar color", () => {
  const theme = getChildTheme({ avatarColor: "#10b981" });

  assert.equal(theme.hex, "#10b981");
  assert.deepEqual(theme.dotStyle, { backgroundColor: "#10b981" });
  assert.deepEqual(theme.borderStyle, { borderLeftColor: "#10b981" });
  assert.deepEqual(theme.surfaceStyle, { backgroundColor: "rgba(16, 185, 129, 0.08)" });
  assert.deepEqual(theme.textStyle, { color: "#10b981" });
  assert.deepEqual(theme.avatarBgStyle, { backgroundColor: "rgb(219, 245, 236)" });
  assert.deepEqual(theme.avatarTextStyle, { color: "rgb(9, 102, 71)" });
});

test("falls back to slate when avatar color is missing or invalid", () => {
  assert.equal(getChildTheme(null).hex, "#64748b");
  assert.deepEqual(getChildTheme({ avatarColor: "not-a-color" }).surfaceStyle, {
    backgroundColor: "rgba(100, 116, 139, 0.08)"
  });
});
