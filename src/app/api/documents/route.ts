import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDocumentInput } from "@/lib/documents/validation";
import {
  canEditDocument,
  getDocumentPermission,
} from "@/lib/documents/permissions";
import { apiError } from "@/lib/documents/api-error";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const documents = await prisma.document.findMany({
      where: {
        OR: [
          { ownerId: session.user.id },
          { shares: { some: { userId: session.user.id } } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      include: {
        owner: { select: { name: true, image: true } },
        shares: {
          where: { userId: session.user.id },
          select: { userId: true, permission: true },
        },
      },
    });
    return NextResponse.json(
      documents.map(({ shares, ...document }) => {
        const permission = getDocumentPermission(
          { ...document, shares },
          session.user.id,
        );
        return {
          ...document,
          permission,
          canEdit: canEditDocument(permission),
          isOwner: permission === "OWNER",
        };
      }),
    );
  } catch (error) {
    return apiError(error, "Unable to load documents. Please try again.");
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { data } = parseDocumentInput(await request.json(), true);
    const document = await prisma.document.create({
      data: { ...data, ownerId: session.user.id },
    });
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    return apiError(error, "Unable to create document. Please try again.");
  }
}
