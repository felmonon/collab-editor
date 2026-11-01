import NextAuth from "next-auth";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { authOptionsForProvider } from "@/lib/auth";
import { readAppleCallbackName } from "@/lib/social-oauth";
import { prisma } from "@/lib/prisma";
import {
  authOrigin, clearLinkIntent, connectionAuthOptions, connectionDestination,
  connectionError, connectionFailure, connectionStarted, isLinkProvider, linkCookie,
  readConnectionStart, readLinkIntent,
} from "@/lib/provider-link";

type AuthContext = { params: Promise<{ nextauth: string[] }> };

async function handler(request: NextRequest, context: AuthContext) {
  const { nextauth } = await context.params;
  const [action, providerId] = nextauth;
  let appleName: string | undefined;
  if (
    request.method === "POST" &&
    action === "callback" &&
    providerId === "apple"
  ) {
    try {
      appleName = await readAppleCallbackName(request);
    } catch {
      // Do not log callback bodies: they contain authorization codes and tokens.
      return new Response("Invalid Apple callback", { status: 400 });
    }
  }
  const baseOptions = authOptionsForProvider(providerId, appleName);
  // Apple retains its existing form_post path. Explicit linking supports only
  // providers whose GET callback carries the existing SameSite=Lax session.
  if (!isLinkProvider(providerId)) return NextAuth(baseOptions)(request, context);
  const origin = authOrigin(request.url);
  const secure = origin.startsWith("https://");
  if (action === "signin" && request.method === "POST") {
    let connecting;
    try { connecting = await readConnectionStart(request, origin); }
    catch { return connectionFailure("ConnectionFailed", secure); }
    const response = await NextAuth(baseOptions)(request, context);
    // A later ordinary login must not inherit a cancelled Connect attempt.
    return connecting && await connectionStarted(response, providerId)
      ? response : clearLinkIntent(response, secure);
  }
  if (action !== "callback") return NextAuth(baseOptions)(request, context);
  const cookie = request.cookies.get(linkCookie(secure).name)?.value;
  const returnCookie = request.cookies.get(`${secure ? "__Secure-" : ""}next-auth.callback-url`)?.value;
  const marker = connectionDestination(returnCookie, origin);
  const requested = Boolean(marker || cookie);
  try {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) throw new Error("Authentication unavailable");
    // Native NextAuth linking resolves the user from JWT.sub, not a body field
    // or a client-provided user ID. Bind the intent to that same identity.
    const token = await getToken({ req: request, secret, secureCookie: secure });
    const currentUserId = typeof token?.sub === "string" ? token.sub : undefined;
    const intent = await readLinkIntent(cookie, secret);
    const userExists = Boolean(currentUserId && await prisma.user.findUnique({ where: { id: currentUserId }, select: { id: true } }));
    const error = connectionError({ requested, provider: providerId, intent, currentUserId, userExists });
    if (error || (marker && marker !== providerId))
      return connectionFailure(error || "ConnectionExpired", secure);
    const options = connectionAuthOptions(baseOptions, { currentUserId, connecting: requested, provider: providerId }, async (provider, providerAccountId) => {
      const account = await prisma.account.findUnique({ where: { provider_providerAccountId: { provider, providerAccountId } }, select: { userId: true } });
      return account?.userId || null;
    });
    const response = await NextAuth(options)(request, context);
    if (requested) {
      const location = response.headers.get("location");
      const target = location ? new URL(location, origin) : null;
      if (target?.pathname === "/api/auth/error" || target?.pathname === "/login") {
        const providerError = target.searchParams.get("error");
        const safeError = providerError === "OAuthAccountNotLinked" ? providerError : "ConnectionFailed";
        response.headers.set("Location", `/account?error=${safeError}`);
      }
    }
    return clearLinkIntent(response, secure);
  } catch {
    return connectionFailure("ConnectionFailed", secure);
  }
}

export { handler as GET, handler as POST };
