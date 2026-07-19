import assert from "node:assert/strict";
import test from "node:test";
import {
  createParentInviteToken,
  createTutorInviteToken,
  verifyParentInviteToken,
  verifyTutorInviteToken
} from "../../src/lib/private-access.ts";

const originalSessionSecret = process.env.PRIVATE_SESSION_SECRET;
const originalTutorCode = process.env.PRIVATE_TUTOR_ACCESS_CODE;
const originalParentCode = process.env.PRIVATE_PARENT_ACCESS_CODE;

function configureSecrets(tutorCode = "tutor-rotation-v1") {
  process.env.PRIVATE_SESSION_SECRET = "test-session-secret-with-at-least-thirty-two-characters";
  process.env.PRIVATE_TUTOR_ACCESS_CODE = tutorCode;
  process.env.PRIVATE_PARENT_ACCESS_CODE = "parent-rotation-v1";
}

test.after(() => {
  if (originalSessionSecret === undefined) delete process.env.PRIVATE_SESSION_SECRET;
  else process.env.PRIVATE_SESSION_SECRET = originalSessionSecret;

  if (originalTutorCode === undefined) delete process.env.PRIVATE_TUTOR_ACCESS_CODE;
  else process.env.PRIVATE_TUTOR_ACCESS_CODE = originalTutorCode;

  if (originalParentCode === undefined) delete process.env.PRIVATE_PARENT_ACCESS_CODE;
  else process.env.PRIVATE_PARENT_ACCESS_CODE = originalParentCode;
});

test("creates a parent invitation and revokes it when the parent secret rotates", async () => {
  configureSecrets();
  const token = await createParentInviteToken();
  assert.equal(await verifyParentInviteToken(token), true);

  process.env.PRIVATE_PARENT_ACCESS_CODE = "parent-rotation-v2";
  assert.equal(await verifyParentInviteToken(token), false);
});

test("creates a scoped tutor invitation and rejects tampering", async () => {
  configureSecrets();
  const token = await createTutorInviteToken({
    childId: "child-1",
    tutorName: "王老师",
    subject: "数学"
  });

  const scope = await verifyTutorInviteToken(token);
  assert.equal(scope?.childId, "child-1");
  assert.equal(scope?.tutorName, "王老师");
  assert.equal(scope?.subject, "数学");
  assert.ok((scope?.expiresAt ?? 0) > Math.floor(Date.now() / 1000));

  const tamperedToken = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
  assert.equal(await verifyTutorInviteToken(tamperedToken), null);
});

test("rotating the tutor access secret revokes existing invitations", async () => {
  configureSecrets("tutor-rotation-v1");
  const token = await createTutorInviteToken({
    childId: "child-2",
    tutorName: "李老师",
    subject: "英语"
  });

  configureSecrets("tutor-rotation-v2");
  assert.equal(await verifyTutorInviteToken(token), null);
});
