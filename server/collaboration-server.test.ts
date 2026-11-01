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

async function recoveryFixture(
  context: import("node:test").TestContext,
  refreshIntervalMs: number,
) {
  const http = createServer();
  let document: CollaborationDocument | null = {
    ownerId: "owner",
    isPublic: false,
    shares: [{ userId: "viewer", permission: "VIEW" }],
    content: "<p>Before the disconnected save</p>",
    title: "Shared draft",
    updatedAt: "2026-11-01T12:00:00.000Z",
  };
  let loadCount = 0;
  let beforeLoad: (() => Promise<void>) | undefined;
  const server = createCollaborationServer(http, {
    origin: "http://localhost",
    refreshIntervalMs,
    verifyTicket: (token) => readCollaborationTicket(token, secret),
    loadDocument: async () => {
      loadCount += 1;
      await beforeLoad?.();
      return document;
    },
  });
  await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve));
  const address = http.address();
  assert.ok(address && typeof address !== "string");
  const clients: Socket[] = [];
  context.after(async () => {
    clients.forEach((socket) => socket.disconnect());
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  return {
    setDocument(value: CollaborationDocument | null) {
      document = value;
    },
    getDocument() {
      assert.ok(document);
      return document;
    },
    getLoadCount() {
      return loadCount;
    },
    beforeLoad(callback?: () => Promise<void>) {
      beforeLoad = callback;
    },
    async join(userId: string) {
      const token = await createCollaborationTicket(
        { userId, documentId: "doc-1", name: userId },
        secret,
      );
      const socket = connect(`http://127.0.0.1:${address.port}`, {
        transports: ["websocket"],
        auth: { token },
        reconnection: false,
      });
      clients.push(socket);
      await nextEvent(socket, "connect");
      const state = nextEvent<{
        content: string;
        title: string;
        updatedAt: string;
      }>(socket, "document-state");
      socket.emit("join-document", { documentId: "doc-1" });
      return { socket, state: await state };
    },
  };
}

test("a returning writer catches existing peers up after a save without a socket notification", async (context) => {
  // Keep the timer outside this test's window: rejoining must itself catch peers up.
  const fixture = await recoveryFixture(context, 10_000);
  const writer = await fixture.join("owner");
  const viewer = await fixture.join("viewer");
  writer.socket.disconnect();
  fixture.setDocument({
    ...fixture.getDocument(),
    content: "<p>Saved through HTTP while disconnected</p>",
    title: "New title",
    updatedAt: "2026-11-01T12:01:00.000Z",
  });
  const update = nextEvent<{
    content: string;
    title: string;
    updatedAt: string;
  }>(viewer.socket, "document-updated");
  const returned = await fixture.join("owner");
  assert.deepEqual(await update, returned.state);
  assert.equal(
    returned.state.content,
    "<p>Saved through HTTP while disconnected</p>",
  );
});

test("a delayed save notification catches its sender up to a newer canonical save", async (context) => {
  const fixture = await recoveryFixture(context, 10_000);
  const writer = await fixture.join("owner");
  const viewer = await fixture.join("viewer");
  // Another authorized writer saved and closed before notifying the room.
  // This sender's delayed notification must not imply it has that newer state.
  fixture.setDocument({
    ...fixture.getDocument(),
    content: "<p>A different writer saved the newest content</p>",
    updatedAt: "2026-11-01T12:01:00.000Z",
  });
  const senderUpdate = nextEvent<{ content: string; updatedAt: string }>(
    writer.socket,
    "document-updated",
  );
  const peerUpdate = nextEvent(viewer.socket, "document-updated");
  writer.socket.emit("document-update", { documentId: "doc-1" });
  const [senderState, peerState] = await Promise.all([senderUpdate, peerUpdate]);
  assert.deepEqual(senderState, peerState);
  assert.equal(senderState.content, "<p>A different writer saved the newest content</p>");
});

test("active rooms recover missed saves and revocation without any writer notification", async (context) => {
  const fixture = await recoveryFixture(context, 30);
  const writer = await fixture.join("owner");
  const viewer = await fixture.join("viewer");
  writer.socket.disconnect();
  let updates = 0;
  viewer.socket.on("document-updated", () => updates++);
  const update = nextEvent<{ content: string; updatedAt: string }>(
    viewer.socket,
    "document-updated",
  );
  fixture.setDocument({
    ...fixture.getDocument(),
    content: "<p>The writer closed after HTTP saved</p>",
    updatedAt: "2026-11-01T12:02:00.000Z",
  });
  assert.equal((await update).content, "<p>The writer closed after HTTP saved</p>");
  await pause();
  assert.equal(updates, 1, "unchanged canonical revisions must not spam clients");
  const disconnected = nextEvent(viewer.socket, "disconnect");
  // Share changes do not advance Document.updatedAt.
  fixture.setDocument({ ...fixture.getDocument(), shares: [] });
  await disconnected;
  await pause();
  const stoppedAt = fixture.getLoadCount();
  await pause();
  assert.equal(
    fixture.getLoadCount(),
    stoppedAt,
    "empty rooms must stop polling",
  );
});

test("a deleted document disconnects idle participants without waiting for an edit", async (context) => {
  const fixture = await recoveryFixture(context, 30);
  const viewer = await fixture.join("viewer");
  const disconnected = nextEvent(viewer.socket, "disconnect");
  fixture.setDocument(null);
  await disconnected;
});

test("slow canonical reads serialize with writer notifications without duplicate updates", async (context) => {
  const fixture = await recoveryFixture(context, 20);
  const writer = await fixture.join("owner");
  const viewer = await fixture.join("viewer");
  let releaseRead!: () => void;
  const blocked = new Promise<void>((resolve) => { releaseRead = resolve; });
  let markStarted!: () => void;
  const started = new Promise<void>((resolve) => { markStarted = resolve; });
  fixture.beforeLoad(async () => {
    markStarted();
    await blocked;
  });
  // Also release the loader if an assertion fails before the normal release.
  context.after(releaseRead);
  const readsBefore = fixture.getLoadCount();
  await started;
  writer.socket.emit("document-update", { documentId: "doc-1" });
  await pause();
  assert.equal(
    fixture.getLoadCount(),
    readsBefore + 1,
    "timer ticks and notifications must not overlap an in-flight read",
  );
  let updates = 0;
  viewer.socket.on("document-updated", () => updates++);
  const update = nextEvent<{ content: string }>(viewer.socket, "document-updated");
  fixture.setDocument({
    ...fixture.getDocument(),
    content: "<p>The latest persisted version</p>",
    updatedAt: "2026-11-01T12:03:00.000Z",
  });
  fixture.beforeLoad();
  releaseRead();
  assert.equal((await update).content, "<p>The latest persisted version</p>");
  await pause();
  assert.equal(updates, 1);
});

test("periodic refresh recovers after a temporary canonical read failure", async (context) => {
  const fixture = await recoveryFixture(context, 20);
  const viewer = await fixture.join("viewer");
  let failures = 0;
  fixture.beforeLoad(async () => {
    if (!failures++) throw new Error("temporary database outage");
  });
  const update = nextEvent<{ content: string }>(viewer.socket, "document-updated");
  fixture.setDocument({
    ...fixture.getDocument(),
    content: "<p>Saved during a temporary outage</p>",
    updatedAt: "2026-11-01T12:04:00.000Z",
  });
  assert.equal((await update).content, "<p>Saved during a temporary outage</p>");
  assert.ok(failures >= 2, "a failed refresh must not poison the room queue");
});
