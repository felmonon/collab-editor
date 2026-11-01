import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { authOrigin, connectionCallback, createLinkIntent, isLinkProvider, linkCookie, readConnectionBody } from "@/lib/provider-link";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true, accounts: { select: { provider: true } } },
    });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ providers: [...new Set(user.accounts.map((account) => account.provider))], hasPassword: Boolean(user.password) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to load sign-in methods. Please try again." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // A JSON same-origin POST is required in addition to the normal NextAuth CSRF
  // check on the subsequent signIn() request. Never create intent from a GET.
  const origin = authOrigin(request.url);
  if (request.headers.get("origin") !== origin || !request.headers.get("content-type")?.startsWith("application/json"))
    return NextResponse.json({ error: "This request must come from your account settings." }, { status: 403 });
  try {
    const body = JSON.parse(await readConnectionBody(request));
    const provider = body?.provider;
    if (!isLinkProvider(provider) || !authOptions.providers.some((option) => option.id === provider))
      return NextResponse.json({ error: "This sign-in method is not available to connect." }, { status: 400 });
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) throw new Error("Authentication unavailable");
    const cookie = linkCookie(origin.startsWith("https://"));
    const response = NextResponse.json({ ok: true, callbackUrl: connectionCallback(provider) }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(cookie.name, await createLinkIntent(user.id, provider, secret), cookie.options);
    return response;
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof RangeError) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    return NextResponse.json({ error: "Unable to start connecting this sign-in method. Please try again." }, { status: 500 });
  }
}
