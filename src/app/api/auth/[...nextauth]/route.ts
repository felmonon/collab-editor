import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { authOptionsForProvider } from "@/lib/auth";
import { readAppleCallbackName } from "@/lib/social-oauth";

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
  return NextAuth(authOptionsForProvider(providerId, appleName))(
    request,
    context,
  );
}

export { handler as GET, handler as POST };
