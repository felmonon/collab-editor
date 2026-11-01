import assert from "node:assert/strict";
import { test } from "node:test";
import { encode } from "next-auth/jwt";
import { createCollaborationTicket, readCollaborationTicket } from "./ticket";

const secret = "test-only-collaboration-secret-at-least-32-characters";
const identity = { userId: "user-1", name: "Ada", documentId: "doc-1" };

test("collaboration tickets bind verified identity to one document", async () => {
  const token = await createCollaborationTicket(identity, secret);
  assert.deepEqual(await readCollaborationTicket(token, secret), identity);
  assert.equal(await readCollaborationTicket(token, "different-secret"), null);
  assert.equal(
    await readCollaborationTicket(token.slice(0, -12) + "tampered", secret),
    null,
  );
  assert.equal(await readCollaborationTicket(null, secret), null);
});

test("session tokens and expired tickets cannot be used as collaboration tickets", async () => {
  const sessionToken = await encode({
    token: { ...identity },
    secret,
    maxAge: 300,
  });
  assert.equal(await readCollaborationTicket(sessionToken, secret), null);
  const salt = "collab-editor:socket-ticket";
  const expired = await encode({
    token: { ...identity, purpose: salt },
    secret,
    salt,
    maxAge: -60,
  });
  assert.equal(await readCollaborationTicket(expired, secret), null);
});
