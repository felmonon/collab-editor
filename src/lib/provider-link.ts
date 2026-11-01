import { decode, encode } from "next-auth/jwt";
import type { NextAuthOptions } from "next-auth";
import type { AdapterAccount } from "next-auth/adapters";

export const LINK_PROVIDERS = ["google", "github"] as const;
export type LinkProvider = (typeof LINK_PROVIDERS)[number];
export const LINK_INTENT_MAX_AGE = 300;
const LINK_SALT = "collab-provider-link-v1";

export function isLinkProvider(value: unknown): value is LinkProvider {
  return value === "google" || value === "github";
}

export function connectionCallback(provider: LinkProvider) {
  return `/account?connect=${provider}`;
}

// This destination is a fail-closed flow marker, never authorization to link.
export function connectionDestination(value: unknown, origin: string) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value, origin);
    const provider = url.searchParams.get("connect");
    return url.origin === origin && url.pathname === "/account" && isLinkProvider(provider)
      ? provider
      : null;
  } catch {
    return null;
  }
}

export function linkCookie(secure: boolean) {
  return {
    name: `${secure ? "__Secure-" : ""}collab-provider-link`,
    options: { httpOnly: true, secure, sameSite: "lax" as const, path: "/api/auth", maxAge: LINK_INTENT_MAX_AGE },
  };
}

export async function createLinkIntent(userId: string, provider: LinkProvider, secret: string) {
  return encode({
    secret, salt: LINK_SALT, maxAge: LINK_INTENT_MAX_AGE,
    token: { purpose: "connect-provider", userId, provider },
  });
}

export async function readLinkIntent(value: unknown, secret: string) {
  if (typeof value !== "string" || !value) return null;
  try {
    const token = await decode({ secret, salt: LINK_SALT, token: value });
    if (token?.purpose !== "connect-provider" || typeof token.userId !== "string" || !token.userId || !isLinkProvider(token.provider)) return null;
    return { userId: token.userId, provider: token.provider };
  } catch {
    return null;
  }
}

export function connectionError({
  requested, provider, intent, currentUserId, userExists,
}: {
  requested: boolean;
  provider: LinkProvider;
  intent: Awaited<ReturnType<typeof readLinkIntent>>;
  currentUserId?: string;
  userExists: boolean;
}): "ConnectionExpired" | "ConnectionSessionChanged" | null {
  if (!requested) return null;
  if (!intent || intent.provider !== provider) return "ConnectionExpired";
  if (!currentUserId || currentUserId !== intent.userId || !userExists) return "ConnectionSessionChanged";
  return null;
}

export async function allowProviderConnection({
  currentUserId, connecting, provider, providerAccountId, accountOwner,
}: {
  currentUserId?: string;
  connecting: boolean;
  provider: string;
  providerAccountId: string;
  accountOwner: (provider: string, providerAccountId: string) => Promise<string | null>;
}) {
  if (!isLinkProvider(provider)) return true;
  if (connecting) return Boolean(currentUserId);
  if (!currentUserId) return true; // Ordinary signed-out login/signup is unchanged.
  // NextAuth implicitly links unknown OAuth identities when a session exists.
  // Permit ordinary reauthentication only for an identity already owned by it.
  return await accountOwner(provider, providerAccountId) === currentUserId;
}

export function connectionAuthOptions(
  base: NextAuthOptions,
  context: { currentUserId?: string; connecting: boolean; provider: LinkProvider },
  accountOwner: (provider: string, providerAccountId: string) => Promise<string | null>,
): NextAuthOptions {
  return {
    ...base,
    adapter: context.connecting && base.adapter ? {
      ...base.adapter,
      // If the initiating user is deleted after our lookup, NextAuth would
      // otherwise fall back to creating a fresh user. A Connect never signs up.
      createUser: async () => { throw new Error("Connection user is no longer available"); },
      linkAccount: async (account: AdapterAccount) => {
        if (account.userId !== context.currentUserId || account.provider !== context.provider)
          throw new Error("Connection account does not match the initiating user");
        return base.adapter!.linkAccount!(account);
      },
    } : base.adapter,
    callbacks: {
      ...base.callbacks,
      async signIn(args) {
        const existing = await base.callbacks?.signIn?.(args);
        if (existing === false || typeof existing === "string") return existing;
        if (!args.account) return true;
        const allowed = await allowProviderConnection({
          ...context,
          provider: args.account.provider,
          providerAccountId: args.account.providerAccountId,
          accountOwner,
        });
        return allowed ? true : "/account?error=ConnectionRequired";
      },
      async jwt(args) {
        if (context.connecting && args.user && args.user.id !== context.currentUserId)
          throw new Error("Connection session no longer matches the initiating user");
        return base.callbacks?.jwt ? base.callbacks.jwt(args) : args.token;
      },
    },
  };
}

export function authOrigin(requestUrl: string) {
  const configured = process.env.NEXTAUTH_URL?.trim();
  return new URL(configured || requestUrl).origin;
}

export async function readConnectionBody(request: Request) {
  const reader = request.clone().body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let body = "";
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) {
        void reader.cancel().catch(() => {});
        throw new RangeError("Sign-in request is too large");
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  return body;
}

export async function readConnectionStart(request: Request, origin: string) {
  return connectionDestination(new URLSearchParams(await readConnectionBody(request)).get("callbackUrl"), origin);
}

export async function connectionStarted(response: Response, provider: LinkProvider) {
  let location = response.headers.get("location");
  if (!location) {
    try { location = (await response.clone().json()).url; }
    catch { return false; }
  }
  if (!location) return false;
  try {
    const url = new URL(location);
    return url.protocol === "https:" && url.hostname === (provider === "google" ? "accounts.google.com" : "github.com");
  } catch { return false; }
}

export function clearLinkIntent(response: Response, secure: boolean) {
  const { name } = linkCookie(secure);
  response.headers.append("Set-Cookie", `${name}=; Path=/api/auth; Max-Age=0; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`);
  return response;
}

export function connectionFailure(error: string, secure: boolean) {
  return clearLinkIntent(new Response(null, {
    status: 303,
    headers: { Location: `/account?error=${encodeURIComponent(error)}`, "Cache-Control": "no-store" },
  }), secure);
}
