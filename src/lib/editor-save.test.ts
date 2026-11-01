import assert from "node:assert/strict";
import test from "node:test";
import { reconcileSavedDraft } from "./editor-save";

const submitted = { title: "Our draft", content: "<p>Our saved text</p>" };
const saved = { ...submitted, updatedAt: "2026-11-01T10:00:01.000Z" };
const remote = {
  title: "Updated by a collaborator",
  content: "<p>Newer shared text</p>",
  updatedAt: "2026-11-01T10:00:02.000Z",
};

test("a later collaborator save wins over our delayed HTTP response when our draft is unchanged", () => {
  const result = reconcileSavedDraft({
    submitted,
    current: submitted,
    saved,
    remote,
  });
  assert.deepEqual(result.draft, {
    title: remote.title,
    content: remote.content,
  });
  assert.equal(result.revision, remote.updatedAt);
  assert.equal(result.status, "saved");
  assert.equal(result.dirty, false);
});

test("edits typed during a save are retained when a newer collaborator version arrives", () => {
  const current = { ...submitted, content: "<p>Our unsaved follow-up</p>" };
  const result = reconcileSavedDraft({ submitted, current, saved, remote });
  assert.deepEqual(result.draft, current);
  assert.equal(result.status, "conflict");
  assert.equal(result.dirty, true);
  assert.equal(result.revision, saved.updatedAt);
  assert.deepEqual(result.pendingRemote, remote);
});

test("edits made during a successful save stay dirty for the next autosave", () => {
  const current = { ...submitted, title: "A new title" };
  const result = reconcileSavedDraft({
    submitted,
    current,
    saved,
    remote: null,
  });
  assert.deepEqual(result.draft, current);
  assert.equal(result.status, "unsaved");
  assert.equal(result.dirty, true);
});

test("a delayed notification older than the HTTP response cannot roll back the document", () => {
  const result = reconcileSavedDraft({
    submitted,
    current: submitted,
    saved: remote,
    remote: saved,
  });
  assert.deepEqual(result.draft, {
    title: remote.title,
    content: remote.content,
  });
  assert.equal(result.revision, remote.updatedAt);
  assert.equal(result.status, "saved");
  assert.equal(result.pendingRemote, null);
});

test("normalized titles from a successful save are reflected only when the user has not kept editing", () => {
  const result = reconcileSavedDraft({
    submitted,
    current: submitted,
    saved: { ...saved, title: "Normalized title" },
    remote: null,
  });
  assert.equal(result.draft.title, "Normalized title");
  assert.equal(result.dirty, false);
});
