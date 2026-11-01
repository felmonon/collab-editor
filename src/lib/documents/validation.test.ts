import assert from "node:assert/strict";
import { test } from "node:test";
import { canEditDocument, getDocumentPermission } from "./permissions";
import {
  InputError,
  parseDocumentInput,
  parseRegistration,
  parseShareInput,
} from "./validation";

test("document creation accepts templates and normalizes empty titles", () => {
  assert.deepEqual(
    parseDocumentInput({ title: "  ", content: "<h1>Brief</h1>" }, true).data,
    { title: "Untitled Document", content: "<h1>Brief</h1>" },
  );
  assert.deepEqual(parseDocumentInput({}, true).data, {
    title: "Untitled Document",
  });
});

test("document updates reject malformed, empty and oversized data", () => {
  for (const value of [
    null,
    [],
    "text",
    {},
    { title: 12 },
    { content: {} },
    { title: "x".repeat(201) },
    { content: "x".repeat(1_000_001) },
  ]) {
    assert.throws(() => parseDocumentInput(value), InputError);
  }
  assert.equal(parseDocumentInput({ content: "" }).data.content, "");
});

test("revision tokens are validated and unrelated properties cannot change ownership", () => {
  const parsed = parseDocumentInput({
    title: "Good",
    ownerId: "attacker",
    isPublic: true,
    expectedUpdatedAt: "2026-11-01T12:00:00.000Z",
  });
  assert.deepEqual(parsed.data, { title: "Good" });
  assert.equal(
    parsed.expectedUpdatedAt?.toISOString(),
    "2026-11-01T12:00:00.000Z",
  );
  assert.throws(
    () => parseDocumentInput({ content: "", expectedUpdatedAt: {} }),
    InputError,
  );
  assert.throws(
    () => parseDocumentInput({ content: "", expectedUpdatedAt: "not a date" }),
    InputError,
  );
});

test("registration normalizes identities and rejects bcrypt truncation", () => {
  assert.deepEqual(
    parseRegistration({
      name: " Ada ",
      email: "  ADA@Example.COM ",
      password: "long-passphrase",
    }),
    { name: "Ada", email: "ada@example.com", password: "long-passphrase" },
  );
  for (const password of ["short", "a".repeat(73), "😀".repeat(19), 12345678]) {
    assert.throws(
      () => parseRegistration({ email: "ada@example.com", password }),
      InputError,
    );
  }
  assert.throws(
    () => parseRegistration({ email: "invalid", password: "long-passphrase" }),
    InputError,
  );
});

test("sharing accepts only explicit view and edit permissions", () => {
  assert.deepEqual(
    parseShareInput({ email: " ADa@example.com ", permission: "EDIT" }),
    { email: "ada@example.com", permission: "EDIT" },
  );
  assert.throws(
    () => parseShareInput({ email: "ada@example.com", permission: "ADMIN" }),
    InputError,
  );
  assert.throws(
    () => parseShareInput({ email: "ada@example.com" }),
    InputError,
  );
});

test("document access distinguishes owner, editor, viewer, public and absent access", () => {
  const document = {
    ownerId: "owner",
    isPublic: false,
    shares: [
      { userId: "editor", permission: "EDIT" },
      { userId: "viewer", permission: "VIEW" },
      { userId: "admin", permission: "ADMIN" },
    ],
  };
  assert.equal(getDocumentPermission(document, "owner"), "OWNER");
  assert.equal(getDocumentPermission(document, "editor"), "EDIT");
  assert.equal(getDocumentPermission(document, "viewer"), "VIEW");
  assert.equal(getDocumentPermission(document, "stranger"), null);
  assert.equal(
    getDocumentPermission({ ...document, isPublic: true }, "stranger"),
    "VIEW",
  );
  for (const id of ["owner", "editor", "admin"])
    assert.equal(canEditDocument(getDocumentPermission(document, id)), true);
  for (const id of ["viewer", "stranger"])
    assert.equal(canEditDocument(getDocumentPermission(document, id)), false);
});
