import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDocumentInput } from "@/lib/documents/validation";
import {
  canEditDocument,
  documentAccess,
  getDocumentPermission,
} from "@/lib/documents/permissions";
import { apiError } from "@/lib/documents/api-error";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const document = await prisma.document.findFirst({
      where: { id, ...documentAccess(session.user.id) },
      include: {
        owner: { select: { name: true, image: true } },
        shares: {
          where: { userId: session.user.id },
          select: { userId: true, permission: true },
        },
      },
    });
    if (!document)
      return NextResponse.json(
        { error: "Document not found or access removed" },
        { status: 404 },
      );
    const { shares, ...fields } = document;
    const permission = getDocumentPermission(
      { ...fields, shares },
      session.user.id,
    );
    return NextResponse.json({
      ...fields,
      permission,
      canEdit: canEditDocument(permission),
      isOwner: permission === "OWNER",
    });
  } catch (error) {
    return apiError(error, "Unable to load document. Please try again.");
  }
}

export async function PATCH(request: Request, { params }: Context) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const { data, expectedUpdatedAt } = parseDocumentInput(
      await request.json(),
    );
    const editAccess = {
      id,
      OR: [
        { ownerId: session.user.id },
        {
          shares: {
            some: {
              userId: session.user.id,
              permission: { in: ["EDIT", "ADMIN"] as ("EDIT" | "ADMIN")[] },
            },
          },
        },
      ],
    };
    // The revision and permission are checked in the same write, preventing stale autosaves.
    const updated = await prisma.$transaction(async (transaction) => {
      const result = await transaction.document.updateMany({
        where: {
          ...editAccess,
          ...(expectedUpdatedAt && { updatedAt: expectedUpdatedAt }),
        },
        data: {
          ...data,
          updatedAt: new Date(
            Math.max(Date.now(), (expectedUpdatedAt?.getTime() ?? 0) + 1),
          ),
        },
      });
      if (result.count === 0) return null;
      return transaction.document.findUnique({ where: { id } });
    });
    if (!updated) {
      const current = await prisma.document.findFirst({
        where: editAccess,
        select: { updatedAt: true },
      });
      if (!current)
        return NextResponse.json(
          { error: "Document not found or you do not have edit access" },
          { status: 403 },
        );
      return NextResponse.json(
        {
          error:
            "This document changed in another session. Reload before saving to avoid overwriting those changes.",
          updatedAt: current.updatedAt,
        },
        { status: 409 },
      );
    }
    return NextResponse.json(updated);
  } catch (error) {
    return apiError(
      error,
      "Unable to save document. Your changes have not been saved.",
    );
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const deleted = await prisma.document.deleteMany({
      where: { id, ownerId: session.user.id },
    });
    if (!deleted.count)
      return NextResponse.json(
        { error: "Document not found or you are not the owner" },
        { status: 403 },
      );
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, "Unable to delete document. Please try again.");
  }
}
