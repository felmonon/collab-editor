import { isIP } from "node:net";
import type { NextAuthOptions } from "next-auth";
import AppleProvider from "next-auth/providers/apple";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { requestGithubToken } from "./github-oauth";

type Environment = Record<string, string | undefined>;

export function appleEnabled(env: Environment) {
  if (!env.APPLE_ID?.trim() || !env.APPLE_SECRET?.trim()) return false;
  try {
    const url = new URL(env.NEXTAUTH_URL?.trim() || "");
    // Apple requires an HTTPS return URL with a domain, not localhost or an IP.
    return (
      url.protocol === "https:" &&
      url.hostname !== "localhost" &&
      !url.hostname.endsWith(".localhost") &&
      !isIP(url.hostname.replace(/^\[|\]$/g, "")) &&
      !url.username &&
      !url.password &&
      !url.hash
    );
  } catch {
    return false;
  }
}

export function socialProviders(env: Environment, appleName?: string) {
  const githubId = env.GITHUB_ID?.trim();
  const githubSecret = env.GITHUB_SECRET?.trim();
  const googleId = env.GOOGLE_ID?.trim();
  const googleSecret = env.GOOGLE_SECRET?.trim();
  return [
    ...(githubId && githubSecret
      ? [
          GithubProvider({
            clientId: githubId,
            clientSecret: githubSecret,
            allowDangerousEmailAccountLinking: false,
            token: {
              url: "https://github.com/login/oauth/access_token",
              request: requestGithubToken,
            },
          }),
        ]
      : []),
    ...(googleId && googleSecret
      ? [
          GoogleProvider({
            clientId: googleId,
            clientSecret: googleSecret,
            authorization: { params: { scope: "openid email profile" } },
            checks: ["pkce", "state"],
            allowDangerousEmailAccountLinking: false,
          }),
        ]
      : []),
    ...(appleEnabled(env)
      ? [
          AppleProvider({
            clientId: env.APPLE_ID!.trim(),
            clientSecret: env.APPLE_SECRET!.trim(),
            authorization: {
              params: { scope: "name email", response_mode: "form_post" },
            },
            // Keep the installed provider's PKCE check and explicitly bind the callback
            // and ID token to this browser. Never bypass checks to fix form_post cookies.
            checks: ["pkce", "state", "nonce"],
            allowDangerousEmailAccountLinking: false,
            profile(profile) {
              return {
                id: profile.sub,
                // Apple sends the name outside its ID token on first consent only.
                // This bounded display value is used only after token/check validation.
                name: appleName || null,
                email: profile.email,
                image: null,
              };
            },
          }),
        ]
      : []),
  ];
}

export function appleCookies(
  env: Environment,
  providerId?: string,
): NextAuthOptions["cookies"] | undefined {
  if (providerId !== "apple" || !appleEnabled(env)) return undefined;
  const cookie = (suffix: string) => ({
    name: `__Secure-next-auth.apple.${suffix}`,
    options: {
      httpOnly: true,
      secure: true,
      sameSite: "none" as const,
      path: "/api/auth",
      maxAge: 15 * 60,
    },
  });
  // Apple's cross-site POST cannot carry Lax cookies. Relax only short-lived,
  // Apple-specific OAuth cookies; session and CSRF cookies retain their defaults.
  return {
    pkceCodeVerifier: cookie("pkce.code_verifier"),
    state: cookie("state"),
    nonce: cookie("nonce"),
    callbackUrl: cookie("callback-url"),
  };
}

export function appleDisplayName(user: unknown): string | undefined {
  if (typeof user !== "string" || user.length > 2048) return undefined;
  try {
    const parsed = JSON.parse(user);
    const name = parsed?.name;
    if (!name || typeof name !== "object" || Array.isArray(name))
      return undefined;
    const parts = [name.firstName, name.lastName];
    if (parts.some((part) => part !== undefined && typeof part !== "string"))
      return undefined;
    const displayName = parts
      .map((part: string | undefined) =>
        (part || "")
          .replace(/[\u0000-\u001f\u007f<>]/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 80),
      )
      .filter(Boolean)
      .join(" ");
    return displayName || undefined;
  } catch {
    return undefined;
  }
}

export const APPLE_CALLBACK_MAX_BYTES = 16_384;

export async function readAppleCallbackName(request: Request) {
  // Bound the bytes actually read, rather than trusting Content-Length. Reading
  // a clone leaves NextAuth's original code/state/token body unchanged.
  const reader = request.clone().body?.getReader();
  if (!reader) return undefined;
  const decoder = new TextDecoder();
  let size = 0;
  let body = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > APPLE_CALLBACK_MAX_BYTES) {
        void reader.cancel();
        throw new Error("Apple callback is too large");
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  return appleDisplayName(new URLSearchParams(body).get("user"));
}
