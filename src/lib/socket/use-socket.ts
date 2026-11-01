"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useEffectEvent,
} from "react";
import { io, Socket } from "socket.io-client";

interface User {
  id: string;
  userId?: string;
  name: string;
  color: string;
}
interface RemoteCursor {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
}
interface DocumentState {
  content: string;
  updatedAt?: string;
  title?: string;
}
interface UseSocketProps {
  documentId: string;
  user: { id: string; name: string };
  enabled?: boolean;
  onDocumentUpdate?: (
    content: string,
    updatedAt?: string,
    title?: string,
  ) => void;
}

export function useSocket({
  documentId,
  user,
  enabled = true,
  onDocumentUpdate,
}: UseSocketProps) {
  const socketRef = useRef<Socket | null>(null);
  const joinedRef = useRef(false);
  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const notifyUpdate = useEffectEvent((state: DocumentState) => {
    onDocumentUpdate?.(state.content, state.updatedAt, state.title);
  });

  useEffect(() => {
    if (!enabled || !documentId || !user.id) return;
    const url =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      (process.env.NODE_ENV === "development"
        ? "http://localhost:3001"
        : undefined);
    if (!url) return;
    let active = true;
    const controller = new AbortController();
    const socket = io(url, {
      transports: ["websocket", "polling"],
      auth: async (callback) => {
        try {
          const response = await fetch(
            `/api/documents/${encodeURIComponent(documentId)}/collaboration`,
            { signal: controller.signal, cache: "no-store" },
          );
          const data = await response.json();
          if (!response.ok)
            throw new Error(data.error || "Unable to join live collaboration");
          if (active) callback({ token: data.token });
        } catch (error) {
          if (!active) return;
          setConnectionError(
            error instanceof Error
              ? error.message
              : "Unable to join live collaboration",
          );
          callback({ token: "" });
        }
      },
    });
    socketRef.current = socket;
    socket.on("connect", () => socket.emit("join-document", { documentId }));
    socket.on("document-state", (state: DocumentState) => {
      joinedRef.current = true;
      setConnected(true);
      setConnectionError(null);
      notifyUpdate(state);
    });
    socket.on("document-updated", (state: DocumentState) =>
      notifyUpdate(state),
    );
    socket.on("disconnect", () => {
      joinedRef.current = false;
      setConnected(false);
      setUsers([]);
      setRemoteCursors([]);
    });
    socket.on("connect_error", (error: Error) => {
      joinedRef.current = false;
      setConnected(false);
      setConnectionError(error.message);
    });
    socket.on("collaboration-error", ({ message }: { message: string }) => {
      setConnectionError(message);
    });
    socket.on("users-updated", ({ users: nextUsers }: { users: User[] }) =>
      setUsers(nextUsers),
    );
    socket.on("cursor-moved", (cursor: RemoteCursor) => {
      setRemoteCursors((current) => [
        ...current.filter((item) => item.id !== cursor.id),
        cursor,
      ]);
    });
    socket.on("user-left", ({ id }: { id: string }) =>
      setRemoteCursors((current) =>
        current.filter((cursor) => cursor.id !== id),
      ),
    );
    return () => {
      active = false;
      controller.abort();
      joinedRef.current = false;
      socket.disconnect();
      socketRef.current = null;
    };
  }, [documentId, user.id, enabled]);

  const sendUpdate = useCallback<
    (content: string, updatedAt?: string, title?: string) => void
  >(() => {
    if (joinedRef.current && socketRef.current?.connected) {
      // Content is read from the database by the server, never trusted from a client.
      socketRef.current.emit("document-update", { documentId });
    }
  }, [documentId]);
  const sendCursorPosition = useCallback(
    (x: number, y: number) => {
      if (joinedRef.current && socketRef.current?.connected)
        socketRef.current.emit("cursor-move", { documentId, x, y });
    },
    [documentId],
  );
  const reconnect = useCallback(() => socketRef.current?.connect(), []);
  return {
    connected: enabled && connected,
    users,
    remoteCursors,
    sendUpdate,
    sendCursorPosition,
    connectionError,
    reconnect,
  };
}
