import type { EditorDraft, SavedEditorDraft } from "./editor-save";

export interface RecoveryDraft {
  draft: EditorDraft;
  baseRevision: string;
}

type RecoveryStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function copy(entry: RecoveryDraft): RecoveryDraft {
  return { draft: { ...entry.draft }, baseRevision: entry.baseRevision };
}

function parse(value: string | null): RecoveryDraft | null {
  if (!value) return null;
  try {
    const entry = JSON.parse(value);
    if (
      entry?.version !== 1 ||
      typeof entry.baseRevision !== "string" ||
      !Number.isFinite(Date.parse(entry.baseRevision)) ||
      typeof entry.draft?.title !== "string" ||
      typeof entry.draft?.content !== "string"
    )
      return null;
    return copy(entry);
  } catch {
    return null;
  }
}

/** Per-tab recovery; memory remains authoritative if browser storage fails. */
export function createDraftRecoveryStore(
  getStorage: () => RecoveryStorage | null,
) {
  const memory = new Map<string, RecoveryDraft | null>();
  const keyFor = (userId: string, documentId: string) =>
    `collab-editor:pending-draft:${JSON.stringify([userId, documentId])}`;

  return {
    read(userId: string, documentId: string): RecoveryDraft | null {
      const key = keyFor(userId, documentId);
      if (memory.has(key)) {
        const entry = memory.get(key);
        return entry ? copy(entry) : null;
      }
      try {
        const entry = parse(getStorage()?.getItem(key) ?? null);
        if (entry) memory.set(key, entry);
        return entry ? copy(entry) : null;
      } catch {
        return null;
      }
    },
    write(userId: string, documentId: string, entry: RecoveryDraft): boolean {
      const key = keyFor(userId, documentId);
      memory.set(key, copy(entry));
      try {
        const storage = getStorage();
        if (!storage) return false;
        storage.setItem(key, JSON.stringify({ version: 1, ...entry }));
        return true;
      } catch {
        return false;
      }
    },
    clear(userId: string, documentId: string) {
      const key = keyFor(userId, documentId);
      // Keep a tombstone so failed removal cannot resurrect an older draft.
      memory.set(key, null);
      try {
        getStorage()?.removeItem(key);
      } catch {
        // The current page still honors the explicit discard/acknowledgement.
      }
    },
  };
}

export const draftRecovery = createDraftRecoveryStore(() =>
  typeof window === "undefined" ? null : window.sessionStorage,
);

/** Only retry against the original revision; never silently replace newer work. */
export function reconcileRecoveredDraft(
  saved: SavedEditorDraft,
  recovery: RecoveryDraft | null,
): {
  draft: EditorDraft;
  revision: string;
  status: "saved" | "unsaved" | "conflict";
} {
  if (
    !recovery ||
    ((recovery.draft.title.trim() || "Untitled document") === saved.title &&
      recovery.draft.content === saved.content)
  ) {
    return {
      draft: { title: saved.title, content: saved.content },
      revision: saved.updatedAt,
      status: "saved",
    };
  }
  return {
    draft: { ...recovery.draft },
    revision: recovery.baseRevision,
    status: recovery.baseRevision === saved.updatedAt ? "unsaved" : "conflict",
  };
}
