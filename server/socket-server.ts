import { createServer } from "http";
import { loadEnvConfig } from "@next/env";
import { createCollaborationServer } from "./collaboration-server";
import { readCollaborationTicket } from "../src/lib/socket/ticket";

loadEnvConfig(process.cwd());

async function start() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || !process.env.DATABASE_URL) {
    throw new Error(
      "Set NEXTAUTH_SECRET and DATABASE_URL on both the app and collaboration server",
    );
  }
  const { prisma } = await import("../src/lib/prisma");
  const httpServer = createServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ status: "ok" }));
  });
  const io = createCollaborationServer(httpServer, {
    origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    verifyTicket: (token) => readCollaborationTicket(token, secret),
    loadDocument: (id) =>
      prisma.document.findUnique({
        where: { id },
        select: {
          title: true,
          content: true,
          updatedAt: true,
          ownerId: true,
          isPublic: true,
          shares: { select: { userId: true, permission: true } },
        },
      }),
  });
  const port = process.env.SOCKET_PORT || process.env.PORT || 3001;
  httpServer.listen(port, () =>
    console.log(`Collaboration server listening on ${port}`),
  );
  const shutdown = () =>
    io.close(() => {
      void prisma.$disconnect().finally(() => process.exit(0));
    });
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

start().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : "Unable to start collaboration server",
  );
  process.exitCode = 1;
});
