import assert from "node:assert/strict";
import { test } from "node:test";
import { encode } from "next-auth/jwt";
import {
  allowProviderConnection, clearLinkIntent, connectionAuthOptions,
  connectionCallback, connectionDestination, connectionError, connectionFailure,
  connectionStarted, createLinkIntent, linkCookie, readConnectionBody,
  readConnectionStart, readLinkIntent,
} from "./provider-link";

const secret = "synthetic-provider-connection-secret-at-least-32-characters";
const origin = "https://app.example.test";

test("connection intent is bound to user and provider and rejects forged or expired tokens", async () => {
  const value = await createLinkIntent("existing-user", "google", secret);
  assert.deepEqual(await readLinkIntent(value, secret), { userId: "existing-user", provider: "google" });
  assert.equal(await readLinkIntent(value, "another-secret"), null);
  assert.equal(await readLinkIntent("forged", secret), null);
  assert.equal(await readLinkIntent(undefined, secret), null);
  const ordinarySession = await encode({ secret, token: { userId: "existing-user", provider: "google", purpose: "connect-provider" } });
  assert.equal(await readLinkIntent(ordinarySession, secret), null, "a session JWT must not be accepted as a link intent");
  const expired = await encode({ secret, salt: "collab-provider-link-v1", maxAge: -60, token: { userId: "existing-user", provider: "google", purpose: "connect-provider" } });
  assert.equal(await readLinkIntent(expired, secret), null);
  const wrongPurpose = await encode({ secret, salt: "collab-provider-link-v1", token: { userId: "existing-user", provider: "google", purpose: "session" } });
  assert.equal(await readLinkIntent(wrongPurpose, secret), null);
});

test("explicit Connect fails closed on lost intent, provider mismatch, changed session, or deleted user", () => {
  const context = { requested: true, provider: "google" as const, intent: { userId: "owner", provider: "google" as const }, currentUserId: "owner", userExists: true };
  assert.equal(connectionError(context), null);
  assert.equal(connectionError({ ...context, intent: null }), "ConnectionExpired");
  assert.equal(connectionError({ ...context, intent: null, currentUserId: undefined }), "ConnectionExpired");
  assert.equal(connectionError({ ...context, provider: "github" }), "ConnectionExpired");
  assert.equal(connectionError({ ...context, currentUserId: undefined }), "ConnectionSessionChanged");
  assert.equal(connectionError({ ...context, currentUserId: "other-user" }), "ConnectionSessionChanged");
  assert.equal(connectionError({ ...context, userExists: false }), "ConnectionSessionChanged");
  assert.equal(connectionError({ ...context, requested: false, intent: null, currentUserId: undefined, userExists: false }), null, "ordinary signed-out sign-in remains available");
});

test("connection destination is only a same-origin Google/GitHub flow marker", () => {
  assert.equal(connectionCallback("google"), "/account?connect=google");
  assert.equal(connectionDestination("/account?connect=google", origin), "google");
  assert.equal(connectionDestination(origin + "/account?connect=github", origin), "github");
  for (const value of [undefined, "/account", "/account?connect=apple", "/documents?connect=google", "https://other.example.test/account?connect=google", "//other.example.test/account?connect=google"])
    assert.equal(connectionDestination(value, origin), null);
});

test("authenticated OAuth cannot silently attach an unknown or foreign identity without intent", async () => {
  const base = { currentUserId: "owner", connecting: false, provider: "google", providerAccountId: "verified-provider-sub" };
  assert.equal(await allowProviderConnection({ ...base, accountOwner: async () => null }), false);
  assert.equal(await allowProviderConnection({ ...base, accountOwner: async () => "other-user" }), false);
  assert.equal(await allowProviderConnection({ ...base, accountOwner: async () => "owner" }), true);
  assert.equal(await allowProviderConnection({ ...base, currentUserId: undefined, accountOwner: async () => null }), true);
  assert.equal(await allowProviderConnection({ ...base, connecting: true, currentUserId: undefined, accountOwner: async () => null }), false);
  assert.equal(await allowProviderConnection({ ...base, provider: "apple", accountOwner: async () => { throw new Error("Apple must keep its existing path"); } }), true);
});

test("request-scoped sign-in guard redirects an unintended native link before adapter mutation", async () => {
  const options = connectionAuthOptions({ providers: [] }, { provider: "google", currentUserId: "owner", connecting: false }, async () => null);
  const result = await options.callbacks!.signIn!({ user: { id: "provider-profile-id" }, account: { provider: "google", providerAccountId: "verified-sub", type: "oauth" } });
  assert.equal(result, "/account?error=ConnectionRequired");
});

test("intent cookies remain short-lived and HttpOnly and failure responses consume them", () => {
  assert.deepEqual(linkCookie(true), { name: "__Secure-collab-provider-link", options: { httpOnly: true, secure: true, sameSite: "lax", path: "/api/auth", maxAge: 300 } });
  assert.equal(linkCookie(false).name, "collab-provider-link");
  const failure = connectionFailure("ConnectionSessionChanged", true);
  assert.equal(failure.status, 303);
  assert.equal(failure.headers.get("location"), "/account?error=ConnectionSessionChanged");
  assert.equal(failure.headers.get("cache-control"), "no-store");
  assert.match(failure.headers.get("set-cookie")!, /__Secure-collab-provider-link=;.*Max-Age=0.*HttpOnly.*SameSite=Lax; Secure/);
  const response = clearLinkIntent(new Response(null, { headers: { "Set-Cookie": "unrelated=preserved; Path=/" } }), false);
  assert.equal(response.headers.getSetCookie().length, 2);
  assert.ok(response.headers.getSetCookie().some((value) => value.startsWith("unrelated=preserved")));
});

test("only successful official-provider kickoffs retain the pending intent", async () => {
  assert.equal(await connectionStarted(Response.json({ url: "https://accounts.google.com/o/oauth2/v2/auth?state=synthetic" }), "google"), true);
  assert.equal(await connectionStarted(new Response(null, { status: 302, headers: { Location: "https://github.com/login/oauth/authorize" } }), "github"), true);
  assert.equal(await connectionStarted(Response.json({ url: origin + "/api/auth/signin?csrf=true" }), "google"), false);
  assert.equal(await connectionStarted(Response.json({ url: "https://other.example.test/authorize" }), "google"), false);
  assert.equal(await connectionStarted(new Response("invalid response", { status: 500 }), "google"), false);
});

test("bounded sign-in parsing preserves the original CSRF body and detects the Connect marker", async () => {
  const body = new URLSearchParams({ csrfToken: "synthetic-csrf", callbackUrl: "/account?connect=google", json: "true" }).toString();
  const request = new Request(origin + "/api/auth/signin/google", { method: "POST", body });
  assert.equal(await readConnectionStart(request, origin), "google");
  assert.equal(await request.text(), body);
  const ordinary = new Request(origin + "/api/auth/signin/google", { method: "POST", body: "callbackUrl=%2Faccount" });
  assert.equal(await readConnectionStart(ordinary, origin), null);
  const oversized = new Request(origin + "/api/account/providers", { method: "POST", body: "x".repeat(4097) });
  assert.equal(oversized.headers.has("content-length"), false);
  await assert.rejects(() => readConnectionBody(oversized), RangeError);
});
