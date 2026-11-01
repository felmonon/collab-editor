import assert from "node:assert/strict";
import test from "node:test";
import {
  createDraftRecoveryStore,
  reconcileRecoveredDraft,
  type RecoveryDraft,
} from "./editor-recovery";
import { reconcileSavedDraft } from "./editor-save";

const revision = "2026-11-01T10:00:00.000Z";
const nextRevision = "2026-11-01T10:00:01.000Z";
const original = { title: "Project notes", content: "<p>Saved paragraph</p>" };
const saved = { ...original, updatedAt: revision };
const recovery: RecoveryDraft = {
  draft: { title: "Revised notes", content: "<p>Unsaved paragraph</p>" },
  baseRevision: revision,
};

function memoryStorage() {
  const entries = new Map<string, string>();
  const storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> = {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => { entries.set(key, value); },
    removeItem: (key) => { entries.delete(key); },
  };
  return { storage, entries };
}

test("a draft survives an immediate editor unmount before autosave runs", () => {
  const { storage } = memoryStorage();
  const editor = createDraftRecoveryStore(() => storage);
  assert.equal(editor.write("alice", "document-1", recovery), true);

  // A new store represents returning after Back discarded the editor instance.
  // There is deliberately no timer or awaited save between writing and leaving.
  const reopenedEditor = createDraftRecoveryStore(() => storage);
  const restored = reopenedEditor.read("alice", "document-1");
  assert.deepEqual(restored, recovery);
  assert.deepEqual(reconcileRecoveredDraft(saved, restored), {
    draft: recovery.draft,
    revision,
    status: "unsaved",
  });
});

test("typing while an earlier save is pending preserves the latest draft on return", () => {
  const { storage } = memoryStorage();
  const editor = createDraftRecoveryStore(() => storage);
  editor.write("alice", "document-1", recovery);
  const submitted = editor.read("alice", "document-1");
  assert.ok(submitted);

  const latest: RecoveryDraft = {
    draft: { ...recovery.draft, content: "<p>Typed after the save started</p>" },
    baseRevision: revision,
  };
  editor.write("alice", "document-1", latest);

  const reopenedEditor = createDraftRecoveryStore(() => storage);
  const restored = reopenedEditor.read("alice", "document-1");
  assert.deepEqual(restored, latest);
  assert.deepEqual(
    reconcileRecoveredDraft(
      { ...submitted.draft, updatedAt: nextRevision },
      restored,
    ),
    { draft: latest.draft, revision, status: "conflict" },
  );
});

test("a successful earlier save rebases further typing so recovery stays unsaved after remount", () => {
  const { storage } = memoryStorage();
  const editor = createDraftRecoveryStore(() => storage);
  const submitted = recovery.draft;
  const current = {
    ...submitted,
    content: "<p>More typing before the save response arrived</p>",
  };
  editor.write("alice", "document-1", {
    draft: current,
    baseRevision: revision,
  });

  const acknowledged = { ...submitted, updatedAt: nextRevision };
  const reconciled = reconcileSavedDraft({
    submitted,
    current,
    saved: acknowledged,
    remote: null,
  });
  assert.equal(reconciled.status, "unsaved");
  assert.equal(reconciled.dirty, true);
  editor.write("alice", "document-1", {
    draft: reconciled.draft,
    baseRevision: reconciled.revision,
  });

  const reopenedEditor = createDraftRecoveryStore(() => storage);
  const restored = reopenedEditor.read("alice", "document-1");
  assert.deepEqual(restored, { draft: current, baseRevision: nextRevision });
  assert.deepEqual(reconcileRecoveredDraft(acknowledged, restored), {
    draft: current,
    revision: nextRevision,
    status: "unsaved",
  });
});

test("recovery keys isolate accounts, documents, and delimiter-like identifiers", () => {
  const { storage } = memoryStorage();
  const pairs = [
    ["alice", "document-1"],
    ["bob", "document-1"],
    ["alice", "document-2"],
    ["a:b", "c"],
    ["a", "b:c"],
    ["ab", "c"],
    ["a", "bc"],
  ];
  const editor = createDraftRecoveryStore(() => storage);
  const expected = pairs.map((_, index) => ({
    ...recovery,
    draft: { ...recovery.draft, title: `Private draft ${index}` },
  }));
  pairs.forEach(([userId, documentId], index) => {
    assert.equal(editor.write(userId, documentId, expected[index]), true);
  });

  const reopenedEditor = createDraftRecoveryStore(() => storage);
  pairs.forEach(([userId, documentId], index) => {
    assert.deepEqual(reopenedEditor.read(userId, documentId), expected[index]);
  });
  assert.equal(reopenedEditor.read("stranger", "document-1"), null);
});

test("unavailable or blocked session storage retains the draft in memory and reports no durable write", () => {
  const unavailable = () => null;
  const blocked = () => { throw new Error("Storage access blocked"); };
  for (const getStorage of [unavailable, blocked]) {
    const editor = createDraftRecoveryStore(getStorage);
    assert.equal(editor.read("alice", "document-1"), null);
    assert.equal(editor.write("alice", "document-1", recovery), false);
    assert.deepEqual(editor.read("alice", "document-1"), recovery);
    editor.clear("alice", "document-1");
    assert.equal(editor.read("alice", "document-1"), null);
  }
});

test("a quota failure cannot replace a newer in-memory edit with an older stored draft", () => {
  const { storage } = memoryStorage();
  const editor = createDraftRecoveryStore(() => storage);
  assert.equal(editor.write("alice", "document-1", recovery), true);
  storage.setItem = () => { throw new Error("Quota exceeded"); };
  const latest: RecoveryDraft = {
    ...recovery,
    draft: { ...recovery.draft, content: "<p>Newest text despite full storage</p>" },
  };
  assert.equal(editor.write("alice", "document-1", latest), false);
  assert.deepEqual(editor.read("alice", "document-1"), latest);
});

test("storage read failures do not crash recovery", () => {
  const { storage } = memoryStorage();
  storage.getItem = () => { throw new Error("Storage read blocked"); };
  const editor = createDraftRecoveryStore(() => storage);
  assert.equal(editor.read("alice", "document-1"), null);
  editor.write("alice", "document-1", recovery);
  assert.deepEqual(editor.read("alice", "document-1"), recovery);
});

test("malformed storage entries are ignored instead of becoming editor content", () => {
  const { storage, entries } = memoryStorage();
  createDraftRecoveryStore(() => storage).write("alice", "document-1", recovery);
  const key = [...entries.keys()][0];
  assert.ok(key);
  const validEnvelope = JSON.parse(entries.get(key) ?? "");
  const malformed = [
    "{not valid json",
    "null",
    "[]",
    "{}",
    JSON.stringify({ ...validEnvelope, draft: { title: 42, content: "<p>Text</p>" } }),
    JSON.stringify({ ...validEnvelope, draft: { title: "Title", content: null } }),
    JSON.stringify({ ...validEnvelope, draft: null }),
    JSON.stringify({ ...validEnvelope, baseRevision: 42 }),
    JSON.stringify({ ...validEnvelope, baseRevision: "not-a-revision" }),
  ];
  for (const value of malformed) {
    storage.setItem(key, value);
    assert.equal(createDraftRecoveryStore(() => storage).read("alice", "document-1"), null);
  }
});

test("clearing an acknowledged draft survives remount and leaves other drafts intact", () => {
  const { storage } = memoryStorage();
  const editor = createDraftRecoveryStore(() => storage);
  editor.write("alice", "document-1", recovery);
  editor.write("alice", "document-2", recovery);
  editor.write("bob", "document-1", recovery);
  editor.clear("alice", "document-1");
  assert.equal(editor.read("alice", "document-1"), null);

  const reopenedEditor = createDraftRecoveryStore(() => storage);
  assert.equal(reopenedEditor.read("alice", "document-1"), null);
  assert.deepEqual(reopenedEditor.read("alice", "document-2"), recovery);
  assert.deepEqual(reopenedEditor.read("bob", "document-1"), recovery);
});

test("failed storage removal cannot resurrect an explicitly discarded draft in the current session", () => {
  const { storage } = memoryStorage();
  const editor = createDraftRecoveryStore(() => storage);
  editor.write("alice", "document-1", recovery);
  storage.removeItem = () => { throw new Error("Storage removal blocked"); };
  assert.doesNotThrow(() => editor.clear("alice", "document-1"));
  assert.equal(editor.read("alice", "document-1"), null);

  const replacement = { ...recovery, draft: { ...original, title: "A fresh draft" } };
  editor.write("alice", "document-1", replacement);
  assert.deepEqual(editor.read("alice", "document-1"), replacement);
});

test("mutable editor snapshots cannot alter a stored recovery draft without another write", () => {
  const editor = createDraftRecoveryStore(() => null);
  const snapshot: RecoveryDraft = {
    draft: { ...recovery.draft },
    baseRevision: revision,
  };
  editor.write("alice", "document-1", snapshot);
  snapshot.draft.content = "<p>Changed outside the store</p>";
  const restored = editor.read("alice", "document-1");
  assert.deepEqual(restored, recovery);
  assert.ok(restored);
  restored.draft.title = "Mutated read result";
  assert.deepEqual(editor.read("alice", "document-1"), recovery);
});

test("without a recovered draft the latest server document remains saved", () => {
  assert.deepEqual(reconcileRecoveredDraft(saved, null), {
    draft: original,
    revision,
    status: "saved",
  });
});

test("an advanced server revision preserves conflicting recovered text and its original base", () => {
  const remote = {
    title: "A collaborator’s revision",
    content: "<p>New shared paragraph</p>",
    updatedAt: nextRevision,
  };
  assert.deepEqual(reconcileRecoveredDraft(remote, recovery), {
    draft: recovery.draft,
    revision,
    status: "conflict",
  });
});

test("a save completed before returning is acknowledged using the server revision", () => {
  assert.deepEqual(
    reconcileRecoveredDraft({ ...recovery.draft, updatedAt: nextRevision }, recovery),
    { draft: recovery.draft, revision: nextRevision, status: "saved" },
  );
});

test("server title normalization does not create a false unsaved draft or conflict", () => {
  for (const [localTitle, serverTitle] of [
    ["  Project notes  ", "Project notes"],
    ["   ", "Untitled document"],
    ["", "Untitled document"],
  ]) {
    const local: RecoveryDraft = {
      draft: { ...original, title: localTitle },
      baseRevision: revision,
    };
    const normalized = { ...original, title: serverTitle };
    assert.deepEqual(
      reconcileRecoveredDraft({ ...normalized, updatedAt: nextRevision }, local),
      { draft: normalized, revision: nextRevision, status: "saved" },
    );
  }
});
