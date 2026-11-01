import Link from "next/link";
import { FileText, LockKeyhole } from "lucide-react";
import { DocumentActions } from "./document-actions";

export interface WorkspaceDocument {
  id: string;
  title: string;
  content: unknown;
  updatedAt: string;
  ownerId: string;
  owner: { name: string | null; image: string | null };
  canEdit?: boolean;
}

function excerpt(content: unknown) {
  if (typeof content !== "string")
    return "Open this document to pick up where you left off.";
  return (
    content
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim() || "A blank page, ready for your next idea."
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  const elapsed = Math.max(0, Date.now() - date.getTime());
  if (elapsed < 60_000) return "Just now";
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m ago`;
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h ago`;
  if (elapsed < 604_800_000) return `${Math.floor(elapsed / 86_400_000)}d ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== new Date().getFullYear()
      ? { year: "numeric" }
      : {}),
  });
}

export function Initials({
  name,
  small = false,
  inverted = false,
}: {
  name: string;
  small?: boolean;
  inverted?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center font-semibold ${inverted ? "bg-[#343947] text-[#e0e4ef]" : "bg-[#edf0fa] text-[#6977a2]"} ${small ? "h-5 w-5 rounded-full text-[8px]" : "h-8 w-8 rounded-[9px] text-[12px]"}`}
    >
      {name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word.charAt(0))
        .join("")
        .toUpperCase() || "Y"}
    </span>
  );
}

export function DocumentCollection({
  documents,
  viewMode,
  userId,
  onDelete,
}: {
  documents: WorkspaceDocument[];
  viewMode: "grid" | "list";
  userId: string;
  onDelete: (document: WorkspaceDocument) => void;
}) {
  const actions = (document: WorkspaceDocument) => (
    <DocumentActions
      id={document.id}
      title={document.title}
      canDelete={document.ownerId === userId}
      onDelete={() => onDelete(document)}
    />
  );
  const owner = (document: WorkspaceDocument) => (
    <span className="flex min-w-0 items-center gap-1.5">
      <Initials small name={document.owner.name || "Document owner"} />
      <span className="truncate text-[12px] text-[#6f7481]">
        {document.ownerId === userId
          ? "You"
          : document.owner.name || "Shared with you"}
      </span>
    </span>
  );
  const updatedAt = (document: WorkspaceDocument) => (
    <time
      dateTime={document.updatedAt}
      title={new Date(document.updatedAt).toLocaleString()}
      className="shrink-0 text-[12px] text-[#6f7481]"
    >
      {formatDate(document.updatedAt)}
    </time>
  );

  if (viewMode === "grid")
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:gap-5">
        {documents.map((document) => (
          <article
            key={document.id}
            className="group relative min-w-0 rounded-xl border border-[#e4e7ef] bg-white transition-all duration-200 hover:border-[#bdc9ed] hover:shadow-[0_8px_24px_-12px_#293c8526]"
          >
            <div className="absolute right-3 top-3 z-10 rounded-lg border border-white bg-white/90 shadow-[0_1px_4px_#17192305]">
              {actions(document)}
            </div>
            <Link
              href={`/documents/${document.id}`}
              aria-label={`Open ${document.title}`}
              className="focus-ring block rounded-t-xl p-2.5 pb-0"
            >
              <div
                aria-hidden="true"
                className="h-[164px] overflow-hidden rounded-[7px] bg-[#f3f4f9] px-6 pt-5"
              >
                <div className="mx-auto min-h-[170px] max-w-[225px] rounded-t-[3px] border border-[#e5e8f0] bg-white px-5 pt-5 shadow-[0_2px_6px_#1d264006] transition-transform duration-200 group-hover:translate-y-[-3px]">
                  <span className="mb-3 block h-1 w-5 rounded-full bg-[#c4cff7]" />
                  <p className="mb-2.5 line-clamp-2 text-[10px] font-semibold leading-[15px] tracking-[-0.01em] text-[#464b59]">
                    {document.title}
                  </p>
                  <p className="line-clamp-6 text-[8px] leading-[14px] text-[#a0a5b2]">
                    {excerpt(document.content)}
                  </p>
                </div>
              </div>
              <div className="px-2.5 pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <FileText
                    size={14}
                    className="shrink-0 text-[#91a1d1]"
                    aria-hidden="true"
                  />
                  <h3
                    className="truncate text-[13px] font-semibold text-[#272b38] transition-colors group-hover:text-[#315bee]"
                    title={document.title}
                  >
                    {document.title}
                  </h3>
                </div>
                {document.canEdit === false && (
                  <span className="mt-2 flex items-center gap-1.5 text-[12px] text-[#6f7481]">
                    <LockKeyhole size={10} aria-hidden="true" />
                    View only
                  </span>
                )}
              </div>
            </Link>
            <div className="flex items-center justify-between gap-2 px-5 pb-4">
              {owner(document)}
              {updatedAt(document)}
            </div>
          </article>
        ))}
      </div>
    );

  return (
    <div className="rounded-xl border border-[#e6e8ef] bg-white">
      <table className="w-full table-fixed text-left">
        <caption className="sr-only">Documents</caption>
        <thead>
          <tr className="border-b border-[#eceef4]">
            <th
              scope="col"
              className="px-5 py-3.5 text-[12px] font-medium text-[#6f7481]"
            >
              Document name
            </th>
            <th
              scope="col"
              className="hidden w-36 px-5 py-3.5 text-[12px] font-medium text-[#6f7481] sm:table-cell"
            >
              Created by
            </th>
            <th
              scope="col"
              className="hidden w-24 px-3 py-3.5 text-[12px] font-medium text-[#6f7481] xl:table-cell"
            >
              Access
            </th>
            <th
              scope="col"
              className="hidden w-32 px-4 py-3.5 text-[12px] font-medium text-[#6f7481] md:table-cell"
            >
              Last edited
            </th>
            <th scope="col" className="w-14">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f0f1f6]">
          {documents.map((document) => (
            <tr
              key={document.id}
              className="transition-colors hover:bg-[#fafbfe]"
            >
              <td className="px-5 py-3.5">
                <Link
                  href={`/documents/${document.id}`}
                  className="focus-ring flex min-w-0 items-center gap-3 rounded-lg"
                >
                  <span className="flex h-9 w-8 shrink-0 items-center justify-center rounded-lg border border-[#e7ebf7] bg-[#f4f6fc] text-[#7e91c9]">
                    <FileText size={16} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-[#353a47] hover:text-[#315bee]">
                      {document.title}
                    </span>
                    <span className="mt-1 block text-[12px] text-[#6f7481] md:hidden">
                      Edited {formatDate(document.updatedAt)}
                    </span>
                  </span>
                </Link>
              </td>
              <td className="hidden px-5 py-4 sm:table-cell">
                {owner(document)}
              </td>
              <td className="hidden px-3 py-4 text-[12px] text-[#6f7481] xl:table-cell">
                {document.ownerId === userId
                  ? "Owner"
                  : document.canEdit === false
                    ? "View only"
                    : "Can edit"}
              </td>
              <td className="hidden px-4 py-4 md:table-cell">
                {updatedAt(document)}
              </td>
              <td className="py-3 pr-3">{actions(document)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
