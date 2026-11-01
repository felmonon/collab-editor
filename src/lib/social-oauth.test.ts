import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { test } from "node:test";
import {
  APPLE_CALLBACK_MAX_BYTES,
  appleCookies,
  appleDisplayName,
  appleEnabled,
  readAppleCallbackName,
  socialProviders,
} from "./social-oauth";

const appleEnv = {
  APPLE_ID: " app.example.signin ",
  APPLE_SECRET: " synthetic-client-secret ",
  NEXTAUTH_URL: " https://app.example.test ",
};

test("social providers require complete trimmed configuration and keep minimal scopes", () => {
  assert.deepEqual(
    socialProviders({
      GITHUB_ID: " ",
      GITHUB_SECRET: "value",
      GOOGLE_ID: "id",
    }),
    [],
  );
  const providers = socialProviders({
    ...appleEnv,
    GITHUB_ID: " github-id ",
    GITHUB_SECRET: " github-secret ",
    GOOGLE_ID: " google-id ",
    GOOGLE_SECRET: " google-secret ",
  });
  assert.deepEqual(
    providers.map((provider) => provider.id),
    ["github", "google", "apple"],
  );
  const github = providers[0].options;
  const google = providers[1].options;
  const apple = providers[2].options;
  assert.ok(github && google && apple);
  assert.equal(github.clientId, "github-id");
  assert.equal(google.clientId, "google-id");
  assert.equal(google.clientSecret, "google-secret");
  assert.deepEqual(google.authorization, {
    params: { scope: "openid email profile" },
  });
  assert.deepEqual(google.checks, ["pkce", "state"]);
  assert.equal(apple.clientId, "app.example.signin");
  assert.equal(apple.clientSecret, "synthetic-client-secret");
  for (const provider of providers)
    assert.equal(provider.options!.allowDangerousEmailAccountLinking, false);
});

test("Apple stays unavailable when its secure return URL or credentials are incomplete", () => {
  for (const NEXTAUTH_URL of [
    undefined,
    "",
    "not-a-url",
    "http://app.example.test",
    "https://localhost",
    "https://dev.localhost",
    "https://127.0.0.1",
    "https://[::1]",
    "https://user:pass@app.example.test",
    "https://app.example.test/#fragment",
  ]) {
    const env = { ...appleEnv, NEXTAUTH_URL };
    assert.equal(appleEnabled(env), false);
    assert.equal(socialProviders(env).length, 0);
    assert.equal(appleCookies(env, "apple"), undefined);
  }
  assert.equal(appleEnabled({ ...appleEnv, APPLE_SECRET: " " }), false);
  assert.equal(appleEnabled(appleEnv), true);
});

test("Apple form_post retains PKCE, state and nonce with narrowly scoped cross-site cookies", () => {
  const apple = socialProviders(appleEnv)[0];
  assert.deepEqual(apple.options!.authorization, {
    params: { scope: "name email", response_mode: "form_post" },
  });
  assert.deepEqual(apple.options!.checks, ["pkce", "state", "nonce"]);
  assert.equal(appleCookies(appleEnv, "google"), undefined);
  assert.equal(appleCookies(appleEnv), undefined);
  const cookies = appleCookies(appleEnv, "apple")!;
  assert.deepEqual(Object.keys(cookies).sort(), [
    "callbackUrl",
    "nonce",
    "pkceCodeVerifier",
    "state",
  ]);
  assert.equal(cookies.sessionToken, undefined);
  assert.equal(cookies.csrfToken, undefined);
  for (const cookie of Object.values(cookies)) {
    assert.match(cookie.name, /^__Secure-next-auth\.apple\./);
    assert.deepEqual(cookie.options, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/api/auth",
      maxAge: 900,
    });
  }
});

test("installed NextAuth verification rejects missing, tampered and cross-provider Apple cookies", async () => {
  // Exercise the installed security checks, rather than substituting test stubs.
  const require = createRequire(import.meta.url);
  const verification = require(
    join(dirname(require.resolve("next-auth")), "core/lib/oauth/checks.js"),
  );
  const options = {
    provider: {
      id: "apple",
      checks: socialProviders(appleEnv)[0].options!.checks,
    },
    cookies: appleCookies(appleEnv, "apple"),
    jwt: { secret: "synthetic-social-checks-secret-at-least-32-characters" },
    logger: { debug() {} },
  };
  const issued: {
    name: string;
    value: string;
    options: { sameSite: string };
  }[] = [];
  const authorization: Record<string, string> = {};
  for (const check of [
    verification.state,
    verification.pkce,
    verification.nonce,
  ])
    await check.create(options, issued, authorization);
  assert.equal(issued.length, 3);
  assert.ok(
    authorization.state && authorization.nonce && authorization.code_challenge,
  );
  assert.equal(authorization.code_challenge_method, "S256");
  const jar = Object.fromEntries(
    issued.map((cookie) => [cookie.name, cookie.value]),
  );
  const consumed: unknown[] = [];
  const received: Record<string, string> = {};
  for (const check of [
    verification.state,
    verification.pkce,
    verification.nonce,
  ]) {
    await check.use(jar, consumed, options, received);
    await assert.rejects(
      () => check.use({}, [], options, {}),
      /cookie was missing/,
    );
    await assert.rejects(
      () =>
        check.use(
          jar,
          [],
          { ...options, provider: { ...options.provider, id: "google" } },
          {},
        ),
      /different provider/,
    );
    const damaged = Object.fromEntries(
      issued.map((cookie) => [cookie.name, "tampered-value"]),
    );
    await assert.rejects(() => check.use(damaged, [], options, {}));
  }
  assert.equal(received.state, authorization.state);
  assert.equal(received.nonce, authorization.nonce);
  assert.ok(received.code_verifier);
  assert.equal(
    consumed.length,
    3,
    "successful checks must expire their cookies",
  );
});

test("Apple consent supplies only a bounded display name, never callback email or identity", async () => {
  const name = appleDisplayName(
    JSON.stringify({
      name: { firstName: "  Ada\n", lastName: "<Lovelace>" },
      email: "untrusted@example.test",
      sub: "forged",
    }),
  );
  assert.equal(name, "Ada Lovelace");
  const profile = socialProviders(appleEnv, name)[0].options!.profile!;
  const user = await profile(
    { sub: "verified-sub", email: "verified@example.test" } as never,
    {},
  );
  assert.deepEqual(user, {
    id: "verified-sub",
    email: "verified@example.test",
    name: "Ada Lovelace",
    image: null,
  });
  const laterProfile = socialProviders(appleEnv)[0].options!.profile!;
  assert.equal(
    (
      await laterProfile(
        { sub: "verified-sub", email: "verified@example.test" } as never,
        {},
      )
    ).name,
    null,
  );
  assert.equal(appleDisplayName("malformed"), undefined);
  assert.equal(
    appleDisplayName(
      JSON.stringify({ name: { firstName: { nested: "value" } } }),
    ),
    undefined,
  );
  assert.equal(appleDisplayName("x".repeat(2049)), undefined);
  assert.ok(
    appleDisplayName(
      JSON.stringify({
        name: { firstName: "x".repeat(500), lastName: "y".repeat(500) },
      }),
    )!.length <= 161,
  );
});

test("reading Apple first-consent data preserves the original security callback body", async () => {
  const body = new URLSearchParams({
    code: "synthetic-code",
    state: "synthetic-state",
    id_token: "synthetic-token",
    user: JSON.stringify({ name: { firstName: "Lin", lastName: "Chen" } }),
  }).toString();
  const request = new Request(
    "https://app.example.test/api/auth/callback/apple",
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    },
  );
  assert.equal(await readAppleCallbackName(request), "Lin Chen");
  assert.equal(await request.text(), body);
  const returning = new Request(request.url, {
    method: "POST",
    body: "code=later&state=checked-by-next-auth",
  });
  assert.equal(await readAppleCallbackName(returning), undefined);
});

test("oversized Apple callbacks are rejected without relying on Content-Length", async () => {
  const request = new Request(
    "https://app.example.test/api/auth/callback/apple",
    { method: "POST", body: "x".repeat(APPLE_CALLBACK_MAX_BYTES + 1) },
  );
  assert.equal(request.headers.has("content-length"), false);
  await assert.rejects(
    () => readAppleCallbackName(request),
    /callback is too large/,
  );
});
