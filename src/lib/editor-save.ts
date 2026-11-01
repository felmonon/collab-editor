export interface EditorDraft {
  title: string;
  content: string;
}

export interface SavedEditorDraft extends EditorDraft {
  updatedAt: string;
}

function sameDraft(a: EditorDraft, b: EditorDraft) {
  return a.title === b.title && a.content === b.content;
}

/** Resolve HTTP completion against edits and notifications received while it was pending. */
export function reconcileSavedDraft({
  submitted,
  current,
  saved,
  remote,
}: {
  submitted: EditorDraft;
  current: EditorDraft;
  saved: SavedEditorDraft;
  remote: SavedEditorDraft | null;
}): {
  draft: EditorDraft;
  revision: string;
  dirty: boolean;
  status: "saved" | "unsaved" | "conflict";
  pendingRemote: SavedEditorDraft | null;
} {
  const editedDuringSave = !sameDraft(submitted, current);
  if (remote && remote.updatedAt > saved.updatedAt) {
    if (editedDuringSave) {
      return {
        draft: current,
        revision: saved.updatedAt,
        dirty: true,
        status: "conflict",
        pendingRemote: remote,
      };
    }
    return {
      draft: { title: remote.title, content: remote.content },
      revision: remote.updatedAt,
      dirty: false,
      status: "saved",
      pendingRemote: null,
    };
  }
  return {
    draft: editedDuringSave
      ? current
      : { title: saved.title, content: saved.content },
    revision: saved.updatedAt,
    dirty: editedDuringSave,
    status: editedDuringSave ? "unsaved" : "saved",
    pendingRemote: null,
  };
}
