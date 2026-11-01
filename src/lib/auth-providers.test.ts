import assert from "node:assert/strict";
import { test } from "node:test";
import { safeSignInDestination } from "./auth-providers";

test("sign-in keeps account and document destinations from same-origin callbacks", () => {
  const origin = "https://collab.example.test";
  for (const path of ["/account", "/documents", "/documents/cm123abc"]) {
    assert.equal(safeSignInDestination(path, origin), path);
    assert.equal(safeSignInDestination(`${origin}${path}`, origin), path);
  }
  assert.equal(safeSignInDestination(`${origin}/account?error=AccessDenied`, origin), "/account");
});

test("sign-in rejects external, executable, and unrelated destinations", () => {
  const origin = "https://collab.example.test";
  for (const callback of [
    null, "https://evil.example/account", "//evil.example/account",
    "https://collab.example.test.evil.example/account", "javascript:alert(1)",
    "/api/auth/signout", "/account/other", "/documents/../../api/auth/signout",
    "/documents/%2f%2fevil.example", "https://[invalid/account",
  ]) assert.equal(safeSignInDestination(callback, origin), "/documents");
});
