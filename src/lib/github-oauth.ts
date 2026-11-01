import type { TokenEndpointHandler } from "next-auth/providers/oauth";

const providerErrors = new Set([
  "incorrect_client_credentials",
  "redirect_uri_mismatch",
  "bad_verification_code",
  "unverified_user_email",
  "invalid_client",
  "invalid_grant",
  "invalid_request",
  "access_denied",
  "server_error",
  "temporarily_unavailable",
]);

function safeExchangeError(value: unknown, fallback: string): Error {
  const code =
    value !== null && typeof value === "object" && "error" in value
      ? value.error
      : undefined;
  const reason =
    typeof code === "string" && providerErrors.has(code) ? code : fallback;

  // NextAuth logs this error. Never attach the raw response, error cause,
  // callback parameters, or provider description: these can contain credentials.
  return new Error(`GitHub OAuth token exchange failed: ${reason}`);
}

export const requestGithubToken: NonNullable<TokenEndpointHandler["request"]> =
  async ({ client, provider, params, checks }) => {
    let tokens;
    try {
      // Keep openid-client's state and PKCE checks and the normal token exchange.
      tokens = await client.oauthCallback(provider.callbackUrl, params, checks);
    } catch (error) {
      throw safeExchangeError(error, "exchange_failed");
    }

    // GitHub can return OAuth errors with HTTP 200. openid-client v5 accepts
    // those as a TokenSet, otherwise masking the reason during profile lookup.
    if (tokens.error) {
      throw safeExchangeError(tokens, "provider_rejected_request");
    }
    if (typeof tokens.access_token !== "string" || !tokens.access_token) {
      throw safeExchangeError(null, "missing_access_token");
    }

    return { tokens };
  };
