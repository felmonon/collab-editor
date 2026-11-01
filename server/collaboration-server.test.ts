import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { io as connect, type Socket } from "socket.io-client";
import {
  createCollaborationServer,
  type CollaborationDocument,
} from "./collaboration-server";
import {
  createCollaborationTicket,
  readCollaborationTicket,
} from "../src/lib/socket/ticket";

const secret = "test-only-collaboration-secret-at-least-32-characters";
const pause = () => new Promise((resolve) => setTimeout(resolve, 100));

function nextEvent<T = unknown>(socket: Socket, event: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const handler = (value: T) => {
      clearTimeout(timeout);
      resolve(value);
    };
    const timeout = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timed out waiting for ${event}`));
    }, 3000);
    socket.once(event, handler);
  });
}

test("authenticated rooms enforce access and broadcast only saved document state", async (context) => {
  const http = createServer();
  let document: CollaborationDocument = {
    ownerId: "owner",
    isPublic: false,
    shares: [
      { userId: "viewer", permission: "VIEW" },
      { userId: "editor", permission: "EDIT" },
    ],
    content: "<p>Saved draft</p>",
    title: "A shared draft",
    updatedAt: new Date("2026-11-01T12:00:00.000Z"),
  };
  const server = createCollaborationServer(http, {
    origin: "http://localhost",
    verifyTicket: (token) => readCollaborationTicket(token, secret),
    loadDocument: async (id) => (id === "doc-1" ? document : null),
  });
  await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve));
  const address = http.address();
  assert.ok(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}`;
  const clients: Socket[] = [];
  context.after(async () => {
    clients.forEach((client) => client.disconnect());
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  const client = async (userId: string, documentId = "doc-1") => {
    const token = await createCollaborationTicket(
      { userId, documentId, name: userId },
      secret,
    );
    const socket = connect(url, {
      transports: ["websocket"],
      auth: { token },
      reconnection: false,
    });
    clients.push(socket);
    await nextEvent(socket, "connect");
    return socket;
  };
  const join = async (socket: Socket) => {
    const received = nextEvent<{
      content: string;
      title: string;
      updatedAt: string;
    }>(socket, "document-state");
    socket.emit("join-document", {
      documentId: "doc-1",
      user: { id: "forged", name: "Forged" },
    });
    return received;
  };

  const anonymous = connect(url, {
    transports: ["websocket"],
    reconnection: false,
  });
  clients.push(anonymous);
  const unauthorized = await nextEvent<Error>(anonymous, "connect_error");
  assert.match(unauthorized.message, /Sign in/);

  const outsider = await client("stranger");
  let rejected = nextEvent<{ message: string }>(
    outsider,
    "collaboration-error",
  );
  outsider.emit("join-document", { documentId: "doc-1" });
  assert.match((await rejected).message, /access removed/);

  const owner = await client("owner");
  const initial = await join(owner);
  assert.equal(initial.content, "<p>Saved draft</p>");
  assert.equal(initial.updatedAt, "2026-11-01T12:00:00.000Z");
  const viewer = await client("viewer");
  const users = nextEvent<{ users: { userId: string; name: string }[] }>(
    owner,
    "users-updated",
  );
  await join(viewer);
  assert.equal(
    (await users).users.find((user) => user.userId === "viewer")?.name,
    "viewer",
  );

  rejected = nextEvent<{ message: string }>(owner, "collaboration-error");
  owner.emit("join-document", { documentId: "other-document" });
  assert.match((await rejected).message, /cannot join/);

  rejected = nextEvent<{ message: string }>(viewer, "collaboration-error");
  viewer.emit("document-update", {
    documentId: "doc-1",
    content: "malicious change",
  });
  assert.match((await rejected).message, /only have permission to view/);

  let receivedUpdates = 0;
  viewer.on("document-updated", () => receivedUpdates++);
  outsider.emit("document-update", {
    documentId: "doc-1",
    content: "cross-room change",
  });
  owner.emit("document-update", null);
  owner.emit("cursor-move", { documentId: "doc-1", x: "invalid", y: 2 });
  await pause();
  assert.equal(receivedUpdates, 0);

  document = {
    ...document,
    content: "<p>New saved content</p>",
    title: "Renamed draft",
    updatedAt: new Date("2026-11-01T12:01:00.000Z"),
  };
  const update = nextEvent<{
    content: string;
    title: string;
    updatedAt: string;
  }>(viewer, "document-updated");
  owner.emit("document-update", {
    documentId: "doc-1",
    content: "untrusted payload",
    version: 0,
  });
  assert.deepEqual(await update, {
    content: "<p>New saved content</p>",
    title: "Renamed draft",
    updatedAt: "2026-11-01T12:01:00.000Z",
  });

  document = { ...document, shares: [] };
  const revoked = nextEvent(viewer, "disconnect");
  owner.emit("document-update", { documentId: "doc-1" });
  await revoked;
  assert.equal(
    receivedUpdates,
    1,
    "revoked viewers must not receive subsequent content",
  );
});
