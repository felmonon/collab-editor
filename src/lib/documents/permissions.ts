export type DocumentPermission = "OWNER" | "ADMIN" | "EDIT" | "VIEW";

export function getDocumentPermission(
  document: {
    ownerId: string;
    isPublic: boolean;
    shares: { userId: string; permission: string }[];
  },
  userId: string,
): DocumentPermission | null {
  if (document.ownerId === userId) return "OWNER";
  const share = document.shares.find((item) => item.userId === userId);
  if (share && ["ADMIN", "EDIT", "VIEW"].includes(share.permission)) {
    return share.permission as DocumentPermission;
  }
  return document.isPublic ? "VIEW" : null;
}

export function canEditDocument(permission: DocumentPermission | null) {
  return (
    permission === "OWNER" || permission === "ADMIN" || permission === "EDIT"
  );
}

export function documentAccess(userId: string) {
  return {
    OR: [
      { ownerId: userId },
      { shares: { some: { userId } } },
      { isPublic: true },
    ],
  };
}
