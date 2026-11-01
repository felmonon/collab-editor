import { PrismaAdapter } from "@auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { appleCookies, socialProviders } from "./social-oauth";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }

        const user = await prisma.user.findFirst({
          where: {
            email: {
              equals: credentials.email.trim().toLowerCase(),
              mode: "insensitive",
            },
          },
        });

        if (!user || !user.password) {
          throw new Error("Invalid email or password");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password,
        );

        if (!isValid) {
          throw new Error("Invalid email or password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
    ...socialProviders(process.env),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

// Request-local options avoid leaking one Apple callback's display name into
// another user's request. The shared options remain suitable for session reads.
export function authOptionsForProvider(
  providerId?: string,
  appleName?: string,
): NextAuthOptions {
  if (providerId !== "apple") return authOptions;
  return {
    ...authOptions,
    providers: [
      authOptions.providers[0],
      ...socialProviders(process.env, appleName),
    ],
    cookies: appleCookies(process.env, providerId),
  };
}
