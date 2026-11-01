import Link from "next/link";
import { FileText } from "lucide-react";
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
  const text = content
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return text || "A blank page, ready for your next idea.";
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
}: {
  name: string;
  small?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[#e8eeed] font-semibold text-[#49655f] ${small ? "h-6 w-6 text-[10px]" : "h-9 w-9 text-xs"}`}
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
    <span className="flex min-w-0 items-center gap-2">
      <Initials small name={document.owner.name || "Document owner"} />
      <span className="truncate text-[11px] text-slate-500">
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
      className="shrink-0 text-[11px] text-slate-400"
    >
      {formatDate(document.updatedAt)}
    </time>
  );

  if (viewMode === "grid")
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {documents.map((document) => (
          <article
            key={document.id}
            className="group relative min-w-0 rounded-xl border border-[#e0e5e8] bg-white transition-colors hover:border-[#a8c8c0]"
          >
            <div className="absolute top-3 right-3">{actions(document)}</div>
            <Link
              href={`/documents/${document.id}`}
              className="focus-ring block rounded-t-xl px-5 pt-5 pb-5"
            >
              <span className="mb-6 flex h-10 w-9 items-center justify-center rounded-lg border border-[#dce9e5] bg-[#f1f7f5] text-[#488c7e]">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3
                className="truncate text-[15px] font-semibold group-hover:text-[#167d72]"
                title={document.title}
              >
                {document.title}
              </h3>
              <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-slate-500">
                {excerpt(document.content)}
              </p>
            </Link>
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-3.5">
              {owner(document)}
              {updatedAt(document)}
            </div>
          </article>
        ))}
      </div>
    );

  return (
    <div className="rounded-xl border border-[#e0e5e8] bg-white">
      <table className="w-full table-fixed text-left">
        <caption className="sr-only">Documents</caption>
        <thead>
          <tr className="border-b border-slate-200">
            <th
              scope="col"
              className="px-5 py-3.5 text-[11px] font-medium text-slate-500"
            >
              Document
            </th>
            <th
              scope="col"
              className="hidden w-40 px-5 py-3.5 text-[11px] font-medium text-slate-500 sm:table-cell"
            >
              Created by
            </th>
            <th
              scope="col"
              className="hidden w-36 px-5 py-3.5 text-[11px] font-medium text-slate-500 md:table-cell"
            >
              Last edited
            </th>
            <th scope="col" className="w-14">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {documents.map((document) => (
            <tr key={document.id} className="hover:bg-[#fcfefd]">
              <td className="px-5 py-4">
                <Link
                  href={`/documents/${document.id}`}
                  className="focus-ring flex min-w-0 items-center gap-3 rounded-lg"
                >
                  <FileText
                    className="h-5 w-5 shrink-0 text-[#488c7e]"
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium hover:text-[#167d72]">
                      {document.title}
                    </span>
                    <span className="mt-1 block text-[11px] text-slate-400 md:hidden">
                      Edited {formatDate(document.updatedAt)}
                    </span>
                  </span>
                </Link>
              </td>
              <td className="hidden px-5 py-4 sm:table-cell">
                {owner(document)}
              </td>
              <td className="hidden px-5 py-4 md:table-cell">
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
