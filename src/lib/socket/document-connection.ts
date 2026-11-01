import { io } from "socket.io-client";

export interface CollaborationUser {
  id: string;
  userId?: string;
  name: string;
  color: string;
}
export interface RemoteCursor {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
}
export interface DocumentState {
  content: string;
  updatedAt?: string;
  title?: string;
}
export interface ConnectionState {
  connected: boolean;
  users: CollaborationUser[];
  remoteCursors: RemoteCursor[];
  connectionError: string | null;
}
export const emptyConnectionState: ConnectionState = {
  connected: false,
  users: [],
  remoteCursors: [],
  connectionError: null,
};

interface Options {
  url: string;
  documentId: string;
  onState: (state: ConnectionState) => void;
  onDocument: (state: DocumentState) => void;
  fetchTicket?: typeof fetch;
  retryDelays?: readonly number[];
}

/** Own one document room, including ticket retries Socket.IO does not perform. */
export function connectDocument({
  url,
  documentId,
  onState,
  onDocument,
  fetchTicket = fetch,
  retryDelays = [1000, 2000, 4000, 8000, 16000],
}: Options) {
  let active = true;
  let joined = false;
  let state = { ...emptyConnectionState };
  let retryCount = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let request: AbortController | null = null;
  let authAttempt = 0;
  let transientTicketFailure = false;
  let ticketError: string | null = null;

  function update(patch: Partial<ConnectionState>) {
    if (!active) return;
    state = { ...state, ...patch };
    onState(state);
  }
  function clearRetry() {
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = null;
  }
  function resetPresence() {
    joined = false;
    update({ connected: false, users: [], remoteCursors: [] });
  }

  const socket = io(url, {
    autoConnect: false,
    forceNew: true,
    transports: ["websocket", "polling"],
    auth: async (callback) => {
      request?.abort();
      const controller = new AbortController();
      request = controller;
      const attempt = ++authAttempt;
      transientTicketFailure = false;
      ticketError = null;
      try {
        const response = await fetchTicket(
          `/api/documents/${encodeURIComponent(documentId)}/collaboration`,
          { signal: controller.signal, cache: "no-store" },
        );
        const data = await response.json().catch(() => null);
        if (!active || controller.signal.aborted || attempt !== authAttempt)
          return;
        if (!response.ok) {
          transientTicketFailure =
            response.status >= 500 || [408, 429].includes(response.status);
          ticketError =
            typeof data?.error === "string"
              ? data.error
              : "Unable to join live collaboration";
        } else if (typeof data?.token !== "string" || !data.token) {
          transientTicketFailure = true;
          ticketError = "Unable to get a collaboration ticket. Please retry.";
        }
        if (ticketError) {
          update({ connectionError: ticketError });
          // Socket.IO's middleware rejection will end this connection attempt.
          callback({ token: "" });
        } else {
          callback({ token: data.token });
        }
      } catch {
        if (!active || controller.signal.aborted || attempt !== authAttempt)
          return;
        transientTicketFailure = true;
        ticketError = "Couldn’t reach live collaboration. Retrying may help.";
        update({ connectionError: ticketError });
        callback({ token: "" });
      }
    },
  });

  socket.on("connect", () => {
    if (active) socket.emit("join-document", { documentId });
  });
  socket.on("document-state", (document: DocumentState) => {
    if (!active) return;
    clearRetry();
    retryCount = 0;
    joined = true;
    update({ connected: true, connectionError: null });
    onDocument(document);
  });
  socket.on("document-updated", (document: DocumentState) => {
    if (active && joined) {
      update({ connectionError: null });
      onDocument(document);
    }
  });
  socket.on("disconnect", () => {
    clearRetry();
    resetPresence();
  });
  socket.on("connect_error", (error: Error) => {
    if (!active) return;
    resetPresence();
    update({ connectionError: ticketError || error.message });
    // Transport failures use Socket.IO's own reconnect loop. Authentication
    // rejection makes socket.active false, so only transient ticket failures
    // need this bounded retry. Access denial and revocation never loop.
    if (
      !socket.active &&
      transientTicketFailure &&
      retryCount < retryDelays.length
    ) {
      clearRetry();
      const delay = retryDelays[retryCount++];
      retryTimer = setTimeout(() => {
        retryTimer = null;
        if (active) socket.connect();
      }, delay);
    }
  });
  socket.on("collaboration-error", ({ message }: { message: string }) => {
    // Some errors affect only an update, not membership. Revocation is followed
    // by a server disconnect, which clears presence without treating viewers
    // or a transient broadcast failure as disconnected.
    update({ connectionError: message });
  });
  socket.on("users-updated", ({ users }: { users: CollaborationUser[] }) => {
    if (joined) update({ users });
  });
  socket.on("cursor-moved", (cursor: RemoteCursor) => {
    if (joined)
      update({
        remoteCursors: [
          ...state.remoteCursors.filter((item) => item.id !== cursor.id),
          cursor,
        ],
      });
  });
  socket.on("user-left", ({ id }: { id: string }) => {
    update({
      remoteCursors: state.remoteCursors.filter((cursor) => cursor.id !== id),
    });
  });
  socket.connect();

  return {
    sendUpdate() {
      if (active && joined && socket.connected)
        socket.emit("document-update", { documentId });
    },
    sendCursorPosition(x: number, y: number) {
      if (active && joined && socket.connected)
        socket.emit("cursor-move", { documentId, x, y });
    },
    reconnect() {
      if (!active) return;
      clearRetry();
      retryCount = 0;
      request?.abort();
      authAttempt += 1;
      // connect() alone is a no-op on a connected socket whose room join failed.
      socket.disconnect();
      resetPresence();
      update({ connectionError: null });
      socket.connect();
    },
    stop() {
      active = false;
      joined = false;
      clearRetry();
      request?.abort();
      authAttempt += 1;
      socket.removeAllListeners();
      socket.disconnect();
    },
  };
}
