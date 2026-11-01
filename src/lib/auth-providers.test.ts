import assert from "node:assert/strict";
import { test } from "node:test";
import { safeSignInDestination } from "./auth-providers";
import { createSessionRecovery, SESSION_RECOVERY_ERROR, SIGN_OUT_ERROR } from "./auth-session";

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

test("concurrent unauthorized requests clear and verify one session before one safe navigation", async () => {
  const events: string[] = [];
  let finishSignOut!: () => void;
  const signingOut = new Promise<void>((resolve) => { finishSignOut = resolve; });
  const recover = createSessionRecovery({
    endSession: async () => { events.push("signout"); await signingOut; },
    readSession: async () => { events.push("verify"); return {}; },
    replace: (url) => events.push(url),
    origin: () => "https://collab.example.test",
  });
  const first = recover("/documents/abc123");
  const second = recover("/account");
  assert.equal(first, second);
  await Promise.resolve();
  assert.deepEqual(events, ["signout"]);
  finishSignOut();
  await first;
  assert.deepEqual(events, ["signout", "verify", "/login?reason=session-expired&callbackUrl=%2Fdocuments%2Fabc123"]);
});

test("recovery can retry when an unsaved-changes prompt cancels navigation", async () => {
  let signOutCount = 0;
  const destinations: string[] = [];
  const recover = createSessionRecovery({
    endSession: async () => { signOutCount += 1; },
    readSession: async () => ({}),
    // location.replace() returns even when the user chooses Stay.
    replace: (url) => destinations.push(url),
    origin: () => "https://collab.example.test",
  });
  await recover("/documents/unsaved-draft");
  await recover("/documents/unsaved-draft");
  assert.equal(signOutCount, 2);
  assert.deepEqual(destinations, [
    "/login?reason=session-expired&callbackUrl=%2Fdocuments%2Funsaved-draft",
    "/login?reason=session-expired&callbackUrl=%2Fdocuments%2Funsaved-draft",
  ]);
});

test("a still-active session never redirects, and successful retry clears recovery failure", async () => {
  let session: unknown = { user: { id: "stale-account" } };
  const destinations: string[] = [];
  const recover = createSessionRecovery({
    endSession: async () => ({}),
    readSession: async () => session,
    replace: (url) => destinations.push(url),
    origin: () => "https://collab.example.test",
  });
  await assert.rejects(recover("/account"), { message: SESSION_RECOVERY_ERROR });
  assert.deepEqual(destinations, []);
  session = {};
  await recover("/account");
  assert.deepEqual(destinations, ["/login?reason=session-expired&callbackUrl=%2Faccount"]);
});

test("sign-out or verification failures stay on the page and expose only safe retry copy", async () => {
  for (const failAt of ["signout", "verify"]) {
    let navigated = false;
    const recover = createSessionRecovery({
      endSession: async () => { if (failAt === "signout") throw new Error("private response details"); },
      readSession: async () => { throw new Error("private response details"); },
      replace: () => { navigated = true; },
      origin: () => "https://collab.example.test",
    });
    await assert.rejects(recover("/account"), { message: SESSION_RECOVERY_ERROR });
    assert.equal(navigated, false);
  }
});

test("session recovery rejects unsafe return destinations and malformed session responses", async () => {
  const destinations: string[] = [];
  const recover = createSessionRecovery({
    endSession: async () => ({}),
    readSession: async () => null,
    replace: (url) => destinations.push(url),
    origin: () => "https://collab.example.test",
  });
  await recover("https://unrelated.example/account");
  assert.deepEqual(destinations, ["/login?reason=session-expired&callbackUrl=%2Fdocuments"]);
  for (const response of [undefined, false, [], "", { error: "unavailable" }]) {
    const invalid = createSessionRecovery({
      endSession: async () => ({}),
      readSession: async () => response,
      replace: () => assert.fail("invalid response must not navigate"),
      origin: () => "https://collab.example.test",
    });
    await assert.rejects(invalid("/account"), { message: SESSION_RECOVERY_ERROR });
  }
});

test("a stalled reset aborts, unlocks retry, and its late completion cannot navigate", async () => {
  let finishStalledRequest!: () => void;
  const stalled = new Promise<void>((resolve) => { finishStalledRequest = resolve; });
  const destinations: string[] = [];
  let calls = 0;
  let firstSignal: AbortSignal | undefined;
  const recover = createSessionRecovery({
    endSession: async (_url, signal) => {
      calls += 1;
      if (calls === 1) { firstSignal = signal; await stalled; }
    },
    readSession: async () => ({}),
    replace: (url) => destinations.push(url),
    origin: () => "https://collab.example.test",
    timeoutMs: 10,
  });
  await assert.rejects(recover("/account"), { message: SESSION_RECOVERY_ERROR });
  assert.equal(firstSignal?.aborted, true);
  assert.deepEqual(destinations, []);
  await recover("/documents/abc123");
  finishStalledRequest();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(destinations, ["/login?reason=session-expired&callbackUrl=%2Fdocuments%2Fabc123"]);
});

test("a stalled session verification is also bounded and cannot redirect after expiry", async () => {
  let finishVerification!: (value: unknown) => void;
  const stalled = new Promise((resolve) => { finishVerification = resolve; });
  let navigated = false;
  const recover = createSessionRecovery({
    endSession: async () => undefined,
    readSession: async () => stalled,
    replace: () => { navigated = true; },
    origin: () => "https://collab.example.test",
    timeoutMs: 10,
  });
  await assert.rejects(recover("/account"), { message: SESSION_RECOVERY_ERROR });
  finishVerification({});
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(navigated, false);
});

test("explicit sign-out uses the same verified session clearing without an expiry notice", async () => {
  const events: string[] = [];
  const exit = createSessionRecovery({
    endSession: async (url) => { events.push(`signout:${url}`); },
    readSession: async () => { events.push("verify"); return {}; },
    replace: (url) => events.push(url),
    origin: () => "https://collab.example.test",
  });
  const logout = exit("/documents", { expired: false });
  assert.equal(exit("/account"), logout, "concurrent 401 recovery shares the active sign-out");
  await logout;
  assert.deepEqual(events, ["signout:/login", "verify", "/login"]);
});

test("explicit sign-out failures use honest sign-out copy and do not navigate", async () => {
  const exit = createSessionRecovery({
    endSession: async () => undefined,
    readSession: async () => ({ user: { id: "still-signed-in" } }),
    replace: () => assert.fail("failed sign-out must stay on the page"),
    origin: () => "https://collab.example.test",
  });
  await assert.rejects(exit("/documents", { expired: false }), { message: SIGN_OUT_ERROR });
});
