import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { documentAccess } from "@/lib/documents/permissions";
import { apiError } from "@/lib/documents/api-error";
import { createCollaborationTicket } from "@/lib/socket/ticket";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret)
      return NextResponse.json(
        { error: "Live collaboration is not configured" },
        { status: 503 },
      );
    const document = await prisma.document.findFirst({
      where: { id, ...documentAccess(session.user.id) },
      select: { id: true },
    });
    if (!document)
      return NextResponse.json(
        { error: "Document not found or access removed" },
        { status: 403 },
      );
    const token = await createCollaborationTicket(
      {
        userId: session.user.id,
        name: session.user.name || "Collaborator",
        documentId: id,
      },
      secret,
    );
    return NextResponse.json(
      { token },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error, "Unable to connect to live collaboration");
  }
}
