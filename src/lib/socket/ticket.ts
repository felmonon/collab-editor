import { decode, encode } from "next-auth/jwt";

export interface CollaborationIdentity {
  userId: string;
  name: string;
  documentId: string;
}

const salt = "collab-editor:socket-ticket";

export async function createCollaborationTicket(
  identity: CollaborationIdentity,
  secret: string,
) {
  return encode({
    token: { ...identity, purpose: salt },
    secret,
    salt,
    maxAge: 300,
  });
}

export async function readCollaborationTicket(
  token: unknown,
  secret: string,
): Promise<CollaborationIdentity | null> {
  if (typeof token !== "string" || !secret) return null;
  try {
    const data = await decode({ token, secret, salt });
    if (
      data?.purpose !== salt ||
      typeof data.userId !== "string" ||
      typeof data.documentId !== "string" ||
      typeof data.name !== "string"
    )
      return null;
    return {
      userId: data.userId,
      documentId: data.documentId,
      name: data.name,
    };
  } catch {
    return null;
  }
}
