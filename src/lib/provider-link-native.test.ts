import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { test } from "node:test";
import type { Account, NextAuthOptions, User } from "next-auth";
import type { Adapter, AdapterAccount, AdapterUser } from "next-auth/adapters";
import { decode, encode } from "next-auth/jwt";
import { connectionAuthOptions } from "./provider-link";

const require = createRequire(import.meta.url);
// Exercise the installed native account handler our request-local guard wraps.
const nativeCallback = require(
  join(dirname(require.resolve("next-auth")), "core/lib/callback-handler.js"),
).default as (parameters: {
  sessionToken?: string;
  profile: User;
  account: Account;
  options: NextAuthOptions;
}) => Promise<{ user: AdapterUser; isNewUser: boolean }>;
const secret = "synthetic-native-link-regression-secret-at-least-32-characters";

function fixture() {
  const original: AdapterUser = {
    id: "user-a", email: "original@example.test", name: "Original account", emailVerified: null,
  };
  const other: AdapterUser = {
    id: "user-b", email: "other@example.test", name: "Other account", emailVerified: null,
  };
  const users = new Map([[original.id, original], [other.id, other]]);
  const accounts = new Map([["google:belongs-to-b", other.id]]);
  const writes: { type: string; userId: string }[] = [];
  const adapter: Adapter = {
    async getUser(id) { return users.get(id) ?? null; },
    async getUserByAccount({ provider, providerAccountId }) {
      return users.get(accounts.get(`${provider}:${providerAccountId}`) || "") ?? null;
    },
    async getUserByEmail(email) {
      return [...users.values()].find((user) => user.email === email) ?? null;
    },
    async createUser(profile: Omit<AdapterUser, "id">) {
      const user = { ...profile, id: "new-user" };
      users.set(user.id, user);
      writes.push({ type: "create", userId: user.id });
      return user;
    },
    async linkAccount(account: AdapterAccount) {
      accounts.set(`${account.provider}:${account.providerAccountId}`, account.userId);
      writes.push({ type: "link", userId: account.userId });
      return account;
    },
  };
  const base: NextAuthOptions & { provider: { allowDangerousEmailAccountLinking: false } } = {
    providers: [], adapter, jwt: { secret, encode, decode }, events: {},
    session: { strategy: "jwt", maxAge: 3600 },
    provider: { allowDangerousEmailAccountLinking: false },
  };
  const owner = async (provider: string, id: string) => accounts.get(`${provider}:${id}`) ?? null;
  const guarded = (currentUserId: string | undefined, connecting = true) =>
    connectionAuthOptions(base, { currentUserId, connecting, provider: "google" }, owner);
  return { original, other, users, accounts, writes, base, guarded };
}

const account = (providerAccountId: string, provider = "google"): Account => ({
  type: "oauth", provider, providerAccountId,
});
const sessionFor = (id: string) => encode({ secret, token: { sub: id, id } });

test("guarded native connection preserves the initiating workspace and is idempotent", async () => {
  const state = fixture();
  const parameters = {
    sessionToken: await sessionFor(state.original.id),
    account: account("new-google-id"),
    // Deliberately different: explicit linking uses the authenticated user, not email matching.
    profile: { id: "new-google-id", email: "provider@example.test", name: "Provider name" },
    options: state.guarded(state.original.id),
  };
  const result = await nativeCallback(parameters);
  assert.equal(result.user.id, state.original.id);
  assert.equal(result.user.email, state.original.email);
  assert.equal(state.accounts.get("google:new-google-id"), state.original.id);
  assert.deepEqual(state.writes, [{ type: "link", userId: state.original.id }]);
  const repeated = await nativeCallback(parameters);
  assert.equal(repeated.user.id, state.original.id);
  assert.equal(state.writes.length, 1, "replaying an already linked identity must not add a user or account");
});

test("guarded native connection cannot take an identity belonging to another user", async () => {
  const state = fixture();
  await assert.rejects(() => nativeCallback({
    sessionToken: undefined,
    account: account("belongs-to-b"),
    profile: { id: "belongs-to-b", email: state.other.email },
    options: state.guarded(state.original.id),
  }).then(async (result) => {
    // The route's JWT callback is a second barrier if the native handler lost its session.
    await state.guarded(state.original.id).callbacks!.jwt!({ token: {}, user: result.user, account: account("belongs-to-b") });
  }), /session no longer matches/);
  await assert.rejects(async () => nativeCallback({
    sessionToken: await sessionFor(state.original.id),
    account: account("belongs-to-b"),
    profile: { id: "belongs-to-b", email: state.other.email },
    options: state.guarded(state.original.id),
  }), { name: "AccountNotLinkedError" });
  assert.equal(state.accounts.get("google:belongs-to-b"), state.other.id);
  assert.deepEqual(state.writes, []);
});

test("ordinary signed-out same-email login still rejects an unlinked provider identity", async () => {
  const state = fixture();
  await assert.rejects(() => nativeCallback({
    account: account("unlinked-same-email"),
    profile: { id: "unlinked-same-email", email: state.original.email },
    options: state.guarded(undefined, false),
  }), { name: "AccountNotLinkedError" });
  assert.equal(state.accounts.has("google:unlinked-same-email"), false);
  assert.deepEqual(state.writes, []);
});

test("deleting the initiating user after the callback precheck cannot create a replacement account", async () => {
  const state = fixture();
  const sessionToken = await sessionFor(state.original.id);
  const options = state.guarded(state.original.id);
  state.users.delete(state.original.id);
  await assert.rejects(() => nativeCallback({
    sessionToken,
    account: account("new-google-id"),
    profile: { id: "new-google-id", email: "fresh@example.test" },
    options,
  }), /Connection user is no longer available/);
  assert.equal(state.users.has("new-user"), false);
  assert.equal(state.accounts.has("google:new-google-id"), false);
  assert.deepEqual(state.writes, []);
});

test("guarded adapter rejects a changed user or provider before writing", async () => {
  const state = fixture();
  const options = state.guarded(state.original.id);
  for (const proposed of [
    { ...account("new-google-id"), userId: state.other.id },
    { ...account("new-github-id", "github"), userId: state.original.id },
  ]) {
    await assert.rejects(async () => options.adapter!.linkAccount!(proposed), /does not match/);
  }
  assert.deepEqual(state.writes, []);
});

test("ordinary signed-out OAuth signup still creates its own user and provider account", async () => {
  const state = fixture();
  const options = state.guarded(undefined, false);
  const newAccount = account("new-signup");
  const profile = { id: "new-signup", email: "new-signup@example.test", name: "New user" };
  assert.equal(await options.callbacks!.signIn!({ user: profile, account: newAccount }), true);
  const result = await nativeCallback({ account: newAccount, profile, options });
  assert.equal(result.user.id, "new-user");
  assert.equal(result.user.email, profile.email);
  assert.equal(state.accounts.get("google:new-signup"), result.user.id);
  assert.deepEqual(state.writes, [
    { type: "create", userId: "new-user" },
    { type: "link", userId: "new-user" },
  ]);
});
