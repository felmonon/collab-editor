import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/documents/api-error";
import {
  normalizeEmail,
  parseShareInput,
  readObject,
} from "@/lib/documents/validation";

type Context = { params: Promise<{ id: string }> };
const userFields = { id: true, name: true, email: true, image: true } as const;

async function authorizeOwner(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  const document = await prisma.document.findFirst({
    where: { id, ownerId: session.user.id },
    select: { id: true, ownerId: true },
  });
  if (!document)
    return {
      error: NextResponse.json(
        { error: "Only the document owner can manage access" },
        { status: 403 },
      ),
    };
  return { document };
}

export async function GET(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const auth = await authorizeOwner(id);
    if (auth.error) return auth.error;
    const shares = await prisma.documentShare.findMany({
      where: { documentId: id },
      include: { user: { select: userFields } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ shares });
  } catch (error) {
    return apiError(error, "Unable to load document access");
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const auth = await authorizeOwner(id);
    if (auth.error) return auth.error;
    const { email, permission } = parseShareInput(await request.json());
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });
    if (!user)
      return NextResponse.json(
        {
          error:
            "No account found. Ask your collaborator to create an account with this email first.",
        },
        { status: 404 },
      );
    if (user.id === auth.document.ownerId)
      return NextResponse.json(
        { error: "The owner already has full access" },
        { status: 400 },
      );
    const share = await prisma.documentShare.upsert({
      where: { documentId_userId: { documentId: id, userId: user.id } },
      create: { documentId: id, userId: user.id, permission },
      update: { permission },
      include: { user: { select: userFields } },
    });
    return NextResponse.json(share, { status: 200 });
  } catch (error) {
    return apiError(error, "Unable to update document access");
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const auth = await authorizeOwner(id);
    if (auth.error) return auth.error;
    const email = normalizeEmail(readObject(await request.json()).email);
    await prisma.documentShare.deleteMany({
      where: {
        documentId: id,
        user: { email: { equals: email, mode: "insensitive" } },
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error, "Unable to remove document access");
  }
}
