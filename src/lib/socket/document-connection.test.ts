import assert from "node:assert/strict";
import { createServer } from "node:http";
import { EventEmitter } from "node:events";
import test, { type TestContext } from "node:test";
import { Server, type Socket } from "socket.io";
import {
  connectDocument,
  emptyConnectionState,
  type ConnectionState,
} from "./document-connection";

const delay = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function harness(
  t: TestContext,
  fetchTicket: typeof fetch,
  retryDelays: number[] = [5, 10],
  join?: (socket: Socket) => void,
) {
  const http = createServer();
  const io = new Server(http);
  const events = new EventEmitter();
  const connections: Socket[] = [];
  let current = emptyConnectionState;
  let stateUpdates = 0;
  io.use((socket, next) =>
    next(
      socket.handshake.auth.token === "accepted"
        ? undefined
        : new Error("Invalid collaboration ticket"),
    ),
  );
  io.on("connection", (socket) => {
    connections.push(socket);
    socket.on("join-document", () => {
      if (join) join(socket);
      else {
        socket.emit("document-state", {
          content: "<p>Saved</p>",
          updatedAt: "2026-11-01T10:00:00.000Z",
        });
        socket.emit("users-updated", {
          users: [{ id: socket.id, name: "Ada", color: "#123456" }],
        });
      }
    });
  });
  await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve));
  const address = http.address();
  assert.ok(address && typeof address !== "string");
  const connection = connectDocument({
    url: `http://127.0.0.1:${address.port}`,
    documentId: "test-document",
    fetchTicket,
    retryDelays,
    onDocument: () => {},
    onState: (state) => {
      current = state;
      stateUpdates += 1;
      events.emit("state");
    },
  });
  t.after(async () => {
    connection.stop();
    await new Promise<void>((resolve) => io.close(() => resolve()));
  });
  function waitFor(predicate: (state: ConnectionState) => boolean) {
    if (predicate(current)) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        events.off("state", changed);
        reject(new Error("Timed out waiting for collaboration state"));
      }, 2000);
      function changed() {
        if (!predicate(current)) return;
        clearTimeout(timeout);
        events.off("state", changed);
        resolve();
      }
      events.on("state", changed);
    });
  }
  return {
    connection,
    connections,
    waitFor,
    state: () => current,
    updates: () => stateUpdates,
  };
}

test("a transient ticket failure recovers without refreshing the document", async (t) => {
  let attempts = 0;
  const room = await harness(t, async () => {
    attempts += 1;
    return attempts === 1
      ? Response.json({ error: "Temporarily unavailable" }, { status: 503 })
      : Response.json({ token: "accepted" });
  });
  await room.waitFor((state) => state.connected && state.users.length === 1);
  assert.equal(attempts, 2);
  assert.equal(room.state().connectionError, null);
});

test("access denial is terminal instead of creating an authentication retry loop", async (t) => {
  let attempts = 0;
  const room = await harness(t, async () => {
    attempts += 1;
    return Response.json({ error: "Access removed" }, { status: 403 });
  });
  await room.waitFor((state) => state.connectionError === "Access removed");
  await delay(60);
  assert.equal(attempts, 1);
  assert.equal(room.state().connected, false);
  assert.equal(room.connections.length, 0);
});

test("network ticket retries are bounded and retain an actionable error", async (t) => {
  let attempts = 0;
  const room = await harness(t, async () => {
    attempts += 1;
    throw new Error("Network unavailable");
  });
  await room.waitFor(
    (state) => attempts === 3 && Boolean(state.connectionError),
  );
  await delay(40);
  assert.equal(attempts, 3);
  assert.equal(room.state().connected, false);
});

test("leaving a document cancels queued retries and all subsequent state updates", async (t) => {
  let attempts = 0;
  const room = await harness(t, async () => {
    attempts += 1;
    throw new Error("Network unavailable");
  }, [80]);
  await room.waitFor((state) => Boolean(state.connectionError));
  room.connection.stop();
  const updates = room.updates();
  await delay(110);
  assert.equal(attempts, 1);
  assert.equal(room.updates(), updates);
});

test("a ticket arriving after leaving cannot reconnect the previous document", async (t) => {
  let releaseTicket: (response: Response) => void = () => {};
  let announceRequest: () => void = () => {};
  const ticket = new Promise<Response>((resolve) => {
    releaseTicket = resolve;
  });
  const requested = new Promise<void>((resolve) => {
    announceRequest = resolve;
  });
  const room = await harness(t, async () => {
    announceRequest();
    return ticket;
  });
  await requested;
  room.connection.stop();
  const updates = room.updates();
  releaseTicket(Response.json({ token: "accepted" }));
  await delay(40);
  assert.equal(room.connections.length, 0);
  assert.equal(room.updates(), updates);
});

test("manual reconnect replaces a connected socket after room joining failed", async (t) => {
  let attempts = 0;
  let joins = 0;
  const room = await harness(
    t,
    async () => {
      attempts += 1;
      return Response.json({ token: "accepted" });
    },
    [5],
    (socket) => {
      joins += 1;
      if (joins === 1)
        socket.emit("collaboration-error", {
          message: "Unable to open live collaboration",
        });
      else socket.emit("document-state", { content: "<p>Recovered room</p>" });
    },
  );
  await room.waitFor((state) => Boolean(state.connectionError));
  assert.equal(room.state().connected, false);
  room.connection.reconnect();
  await room.waitFor((state) => state.connected);
  assert.equal(attempts, 2);
  assert.equal(room.connections.length, 2);
  assert.notEqual(room.connections[0].id, room.connections[1].id);
});

test("a room update error preserves membership, while server revocation clears presence without reconnecting", async (t) => {
  let attempts = 0;
  const room = await harness(t, async () => {
    attempts += 1;
    return Response.json({ token: "accepted" });
  });
  await room.waitFor((state) => state.connected && state.users.length === 1);
  const socket = room.connections[0];
  socket.emit("collaboration-error", {
    message: "You only have permission to view this document",
  });
  await room.waitFor((state) => Boolean(state.connectionError));
  assert.equal(room.state().connected, true);
  socket.emit("document-updated", { content: "<p>Healthy sync resumed</p>" });
  await room.waitFor(
    (state) => state.connected && state.connectionError === null,
  );
  socket.emit("collaboration-error", {
    message: "Your access to this document was removed",
  });
  socket.disconnect(true);
  await room.waitFor((state) => !state.connected);
  assert.deepEqual(room.state().users, []);
  assert.deepEqual(room.state().remoteCursors, []);
  assert.equal(
    room.state().connectionError,
    "Your access to this document was removed",
  );
  await delay(40);
  assert.equal(attempts, 1);
});
