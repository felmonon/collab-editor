import type { Server as HttpServer } from "http";
import { Server, type Socket } from "socket.io";
import {
  canEditDocument,
  getDocumentPermission,
} from "../src/lib/documents/permissions";
import type { CollaborationIdentity } from "../src/lib/socket/ticket";

export interface CollaborationDocument {
  ownerId: string;
  isPublic: boolean;
  shares: { userId: string; permission: string }[];
  content: unknown;
  title: string;
  updatedAt: Date | string;
}

interface Dependencies {
  origin: string;
  refreshIntervalMs?: number;
  verifyTicket: (token: unknown) => Promise<CollaborationIdentity | null>;
  loadDocument: (id: string) => Promise<CollaborationDocument | null>;
}

type Participant = { id: string; userId: string; name: string; color: string };
type Room = {
  users: Map<string, Participant>;
  updates: Promise<void>;
  revision: number;
  pendingJoins: number;
  refreshQueued: boolean;
  timer?: ReturnType<typeof setInterval>;
};
const colors = [
  "#547968",
  "#8b5cf6",
  "#d97757",
  "#3b82f6",
  "#b45309",
  "#db2777",
];

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function createCollaborationServer(
  httpServer: HttpServer,
  { origin, verifyTicket, loadDocument, refreshIntervalMs = 5000 }: Dependencies,
) {
  const io = new Server(httpServer, {
    cors: { origin, methods: ["GET", "POST"] },
    maxHttpBufferSize: 1_100_000,
  });
  const rooms = new Map<string, Room>();

  function removeEmptyRoom(documentId: string, room: Room) {
    if (room.users.size || room.pendingJoins || rooms.get(documentId) !== room)
      return;
    clearInterval(room.timer);
    rooms.delete(documentId);
  }

  httpServer.once("close", () => {
    for (const room of rooms.values()) clearInterval(room.timer);
    rooms.clear();
  });

  io.use(async (socket, next) => {
    try {
      const identity = await verifyTicket(socket.handshake.auth.token);
      if (!identity)
        return next(new Error("Sign in to join live collaboration"));
      socket.data.identity = identity;
      next();
    } catch {
      next(new Error("Unable to verify collaboration access"));
    }
  });

  function leave(socket: Socket) {
    const documentId = socket.data.documentId as string | undefined;
    if (!documentId) return;
    const room = rooms.get(documentId);
    socket.leave(documentId);
    delete socket.data.documentId;
    if (!room) return;
    room.users.delete(socket.id);
    io.to(documentId).emit("user-left", { id: socket.id });
    io.to(documentId).emit("users-updated", {
      users: Array.from(room.users.values()),
    });
    removeEmptyRoom(documentId, room);
  }

  function removeRevokedParticipants(
    documentId: string,
    document: CollaborationDocument,
  ) {
    const room = rooms.get(documentId);
    if (!room) return;
    for (const participant of room.users.values()) {
      if (!getDocumentPermission(document, participant.userId)) {
        const socket = io.sockets.sockets.get(participant.id);
        if (socket) {
          socket.emit("collaboration-error", {
            message: "Your access to this document was removed",
          });
          leave(socket);
          socket.disconnect(true);
        }
      }
    }
  }

  const state = (document: CollaborationDocument) => ({
    content: typeof document.content === "string" ? document.content : "",
    title: document.title,
    updatedAt: new Date(document.updatedAt).toISOString(),
  });

  function reconcileAccess(
    documentId: string,
    room: Room,
    document: CollaborationDocument | null,
  ): document is CollaborationDocument {
    if (rooms.get(documentId) !== room) return false;
    if (!document) {
      for (const id of room.users.keys())
        io.sockets.sockets.get(id)?.disconnect(true);
      return false;
    }
    // Sharing changes do not advance the document revision.
    removeRevokedParticipants(documentId, document);
    return rooms.get(documentId) === room;
  }

  function publishState(
    documentId: string,
    room: Room,
    document: CollaborationDocument,
    exceptSocketId?: string,
  ) {
    const revision = new Date(document.updatedAt).getTime();
    if (revision <= room.revision) return;
    room.revision = revision;
    const recipients = io.to(documentId);
    (exceptSocketId ? recipients.except(exceptSocketId) : recipients).emit(
      "document-updated",
      state(document),
    );
  }

  function startRefresh(documentId: string, room: Room) {
    if (room.timer) return;
    // The HTTP save can finish after its writer closes or loses their socket.
    // One queued refresh per active room recovers that missing notification.
    room.timer = setInterval(() => {
      if (room.refreshQueued || !room.users.size) return;
      room.refreshQueued = true;
      room.updates = room.updates
        .then(async () => {
          if (rooms.get(documentId) !== room || !room.users.size) return;
          const document = await loadDocument(documentId);
          if (reconcileAccess(documentId, room, document))
            publishState(documentId, room, document);
        })
        // A temporary database failure must not stop subsequent refreshes.
        .catch(() => {})
        .finally(() => {
          room.refreshQueued = false;
        });
    }, refreshIntervalMs);
    room.timer.unref();
  }

  io.on("connection", (socket) => {
    const identity = socket.data.identity as CollaborationIdentity;

    socket.on("join-document", (payload: unknown) => {
      const { documentId } = object(payload);
      if (
        documentId !== identity.documentId ||
        typeof documentId !== "string"
      ) {
        socket.emit("collaboration-error", {
          message: "You cannot join this document",
        });
        return;
      }
      let room = rooms.get(documentId);
      if (!room) {
        room = {
          users: new Map(),
          updates: Promise.resolve(),
          revision: -Infinity,
          pendingJoins: 0,
          refreshQueued: false,
        };
        rooms.set(documentId, room);
      }
      const joiningRoom = room;
      joiningRoom.pendingJoins++;
      joiningRoom.updates = joiningRoom.updates
        .then(async () => {
          if (!socket.connected || rooms.get(documentId) !== joiningRoom) return;
          const document = await loadDocument(documentId);
          if (!socket.connected || rooms.get(documentId) !== joiningRoom) return;
          if (
            !reconcileAccess(documentId, joiningRoom, document) ||
            !getDocumentPermission(document, identity.userId)
          ) {
            socket.emit("collaboration-error", {
              message: "Document not found or access removed",
            });
            return;
          }
          leave(socket);
          socket.data.documentId = documentId;
          const participant = {
            id: socket.id,
            userId: identity.userId,
            name: identity.name,
            color: colors[joiningRoom.users.size % colors.length],
          };
          joiningRoom.users.set(socket.id, participant);
          await socket.join(documentId);
          if (!socket.connected) return;
          // Rejoining also catches peers up before the next periodic refresh.
          publishState(documentId, joiningRoom, document, socket.id);
          socket.emit("document-state", state(document));
          io.to(documentId).emit("users-updated", {
            users: Array.from(joiningRoom.users.values()),
          });
          startRefresh(documentId, joiningRoom);
        })
        .catch(() => {
          socket.emit("collaboration-error", {
            message: "Unable to open live collaboration",
          });
        })
        .finally(() => {
          joiningRoom.pendingJoins--;
          removeEmptyRoom(documentId, joiningRoom);
        });
    });

    // A notification follows a successful HTTP save. Only persisted content is broadcast.
    socket.on("document-update", (payload: unknown) => {
      const { documentId } = object(payload);
      if (
        typeof documentId !== "string" ||
        documentId !== socket.data.documentId ||
        documentId !== identity.documentId
      )
        return;
      const room = rooms.get(documentId);
      if (!room) return;
      room.updates = room.updates
        .then(async () => {
          if (
            !socket.connected ||
            socket.data.documentId !== documentId ||
            rooms.get(documentId) !== room
          )
            return;
          const document = await loadDocument(documentId);
          if (!reconcileAccess(documentId, room, document)) return;
          if (
            !canEditDocument(getDocumentPermission(document, identity.userId))
          ) {
            socket.emit("collaboration-error", {
              message: "You only have permission to view this document",
            });
            return;
          }
          // A delayed notification may read a newer save from another writer.
          // Its sender needs that canonical state too.
          publishState(documentId, room, document);
        })
        .catch(() => {
          socket.emit("collaboration-error", {
            message:
              "Your document is saved, but live sync is temporarily unavailable",
          });
        });
    });

    let lastCursorUpdate = 0;
    socket.on("cursor-move", (payload: unknown) => {
      const { documentId, x, y } = object(payload);
      if (
        documentId !== socket.data.documentId ||
        documentId !== identity.documentId ||
        typeof documentId !== "string"
      )
        return;
      if (
        typeof x !== "number" ||
        typeof y !== "number" ||
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        x < 0 ||
        y < 0 ||
        x > 100_000 ||
        y > 100_000
      )
        return;
      if (Date.now() - lastCursorUpdate < 40) return;
      lastCursorUpdate = Date.now();
      const participant = rooms.get(documentId)?.users.get(socket.id);
      if (participant)
        socket
          .to(documentId)
          .emit("cursor-moved", {
            id: participant.id,
            name: participant.name,
            color: participant.color,
            x,
            y,
          });
    });

    socket.on("disconnect", () => leave(socket));
  });

  return io;
}
