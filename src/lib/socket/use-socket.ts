"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useEffectEvent,
  useMemo,
} from "react";
import {
  connectDocument,
  emptyConnectionState,
  type ConnectionState,
  type DocumentState,
} from "./document-connection";

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
  // A new identity also covers disable/re-enable: no previous room's users,
  // errors, or connected status are shown while the next room is joining.
  const scope = useMemo(
    () => ({ documentId, userId: user.id, enabled }),
    [documentId, user.id, enabled],
  );
  const connectionRef = useRef<{
    scope: typeof scope;
    connection: ReturnType<typeof connectDocument>;
  } | null>(null);
  const [snapshot, setSnapshot] = useState<{
    scope: typeof scope | null;
    state: ConnectionState;
  }>({ scope: null, state: emptyConnectionState });
  const notifyUpdate = useEffectEvent((state: DocumentState) => {
    onDocumentUpdate?.(state.content, state.updatedAt, state.title);
  });

  useEffect(() => {
    if (!scope.enabled || !scope.documentId || !scope.userId) return;
    const url =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      (process.env.NODE_ENV === "development"
        ? "http://localhost:3001"
        : undefined);
    if (!url) return;
    const connection = connectDocument({
      url,
      documentId: scope.documentId,
      onState: (state) => setSnapshot({ scope, state }),
      onDocument: (state) => notifyUpdate(state),
    });
    connectionRef.current = { scope, connection };
    return () => {
      connection.stop();
      if (connectionRef.current?.connection === connection)
        connectionRef.current = null;
    };
  }, [scope]);

  const sendUpdate = useCallback<
    (content: string, updatedAt?: string, title?: string) => void
  >(() => {
    if (connectionRef.current?.scope === scope)
      connectionRef.current.connection.sendUpdate();
  }, [scope]);
  const sendCursorPosition = useCallback(
    (x: number, y: number) => {
      if (connectionRef.current?.scope === scope)
        connectionRef.current.connection.sendCursorPosition(x, y);
    },
    [scope],
  );
  const reconnect = useCallback(() => {
    if (connectionRef.current?.scope === scope)
      connectionRef.current.connection.reconnect();
  }, [scope]);
  const state =
    snapshot.scope === scope && enabled ? snapshot.state : emptyConnectionState;
  return { ...state, sendUpdate, sendCursorPosition, reconnect };
}
