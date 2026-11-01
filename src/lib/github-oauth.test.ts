import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";
import { TokenSet } from "openid-client";
import { requestGithubToken } from "./github-oauth";

type Context = Parameters<typeof requestGithubToken>[0];
const params = { code: "private-authorization-code", state: "private-state" };
const checks = { state: "private-state", code_verifier: "private-verifier" };
const callbackUrl = "https://example.test/api/auth/callback/github";

function context(exchange: Context["client"]["oauthCallback"]): Context {
  return {
    client: { oauthCallback: exchange } as Context["client"],
    provider: { callbackUrl } as Context["provider"],
    params,
    checks,
  };
}

function assertSafeError(error: unknown, reason: string): boolean {
  assert.ok(error instanceof Error);
  assert.equal(error.message, `GitHub OAuth token exchange failed: ${reason}`);
  const logged = inspect(error, { depth: null, showHidden: true });
  for (const secret of [
    params.code,
    params.state,
    checks.code_verifier,
    "private-access-token",
    "private-refresh-token",
    "private-client-secret",
    "injected-log-line",
  ]) {
    assert.ok(!logged.includes(secret), `Error output must omit ${secret}`);
  }
  assert.equal("cause" in error, false);
  assert.deepEqual(Object.keys(error), []);
  return true;
}

test("GitHub exchange forwards callback parameters and security checks unchanged", async () => {
  const tokens = new TokenSet({ access_token: "private-access-token", scope: "read:user" });
  let called = false;
  const result = await requestGithubToken(context(async (url, actualParams, actualChecks) => {
    called = true;
    assert.equal(url, callbackUrl);
    assert.equal(actualParams, params);
    assert.equal(actualChecks, checks);
    return tokens;
  }));
  assert.ok(called);
  assert.equal(result.tokens, tokens);
});

test("GitHub HTTP 200 error bodies expose only a known error code", async () => {
  for (const code of ["incorrect_client_credentials", "redirect_uri_mismatch", "bad_verification_code", "unverified_user_email"]) {
    await assert.rejects(
      async () => requestGithubToken(context(async () => new TokenSet({
        error: code,
        error_description: "private-client-secret\ninjected-log-line",
        access_token: "private-access-token",
        refresh_token: "private-refresh-token",
        code: params.code,
      }))),
      (error) => assertSafeError(error, code),
    );
  }
});

test("unknown provider error values and absent access tokens are sanitized", async () => {
  for (const value of ["private-client-secret\ninjected-log-line", { code: params.code }]) {
    await assert.rejects(
      async () => requestGithubToken(context(async () => new TokenSet({ error: value }))),
      (error) => assertSafeError(error, "provider_rejected_request"),
    );
  }
  await assert.rejects(
    async () => requestGithubToken(context(async () => new TokenSet({ refresh_token: "private-refresh-token" }))),
    (error) => assertSafeError(error, "missing_access_token"),
  );
});

test("exchange and security failures still reject without logging their raw details", async () => {
  const securityError = Object.assign(new Error(`state mismatch: ${params.state}`), {
    params,
    checks,
    response: { access_token: "private-access-token" },
  });
  const providerError = Object.assign(new Error("private-client-secret"), {
    error: "incorrect_client_credentials",
    error_description: "private-access-token\ninjected-log-line",
    response: { refresh_token: "private-refresh-token" },
  });
  for (const [failure, reason] of [[securityError, "exchange_failed"], [providerError, "incorrect_client_credentials"]] as const) {
    await assert.rejects(
      async () => requestGithubToken(context(async () => { throw failure; })),
      (error) => assertSafeError(error, reason),
    );
  }
});
