"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  ChevronRight,
  FilePlus2,
  FileText,
  FolderOpen,
  LayoutGrid,
  List,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import {
  DocumentCollection,
  Initials,
  type WorkspaceDocument,
} from "@/components/documents/document-collection";
import {
  DocumentTemplates,
  documentTemplates,
  type DocumentTemplate,
} from "@/components/documents/document-templates";
import { DeleteDocumentDialog } from "@/components/documents/delete-document-dialog";

type Filter = "all" | "mine" | "shared";
type Sort = "updated" | "oldest" | "name";

const filters: { id: Filter; label: string; icon: typeof FileText }[] = [
  { id: "all", label: "All documents", icon: FolderOpen },
  { id: "mine", label: "Created by me", icon: FileText },
  { id: "shared", label: "Shared with me", icon: Users },
];

export default function DocumentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { addToast } = useToast();
  const [documents, setDocuments] = useState<WorkspaceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("updated");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [documentToDelete, setDocumentToDelete] =
    useState<WorkspaceDocument | null>(null);
  const userId = session?.user?.id;
  const userName = session?.user?.name || "Your workspace";

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  const fetchDocuments = useCallback(
    (signal?: AbortSignal) => {
      return fetch("/api/documents", { signal })
        .then(async (response) => {
          if (response.status === 401) {
            router.replace("/login");
            return;
          }
          if (!response.ok) throw new Error("Failed to load documents");
          const data = await response.json();
          if (!Array.isArray(data)) throw new Error("Unexpected response");
          if (signal?.aborted) return;
          setDocuments(data);
          setError("");
        })
        .catch(() => {
          if (!signal?.aborted)
            setError(
              "Your documents couldn’t be loaded. Check your connection and try again.",
            );
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false);
        });
    },
    [router],
  );

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    void fetchDocuments(controller.signal);
    return () => controller.abort();
  }, [userId, fetchDocuments]);

  const createDocument = async (
    template: DocumentTemplate = documentTemplates[0],
  ) => {
    if (creating) return;
    setCreating(template.id);
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: template.documentTitle,
          content: template.content,
        }),
      });
      if (!response.ok) throw new Error("Failed to create document");
      const document = await response.json();
      router.push(`/documents/${document.id}`);
    } catch {
      addToast("Your document couldn’t be created. Please try again.", "error");
      setCreating(null);
    }
  };

  const counts = useMemo(
    () => ({
      all: documents.length,
      mine: documents.filter((document) => document.ownerId === userId).length,
      shared: documents.filter((document) => document.ownerId !== userId)
        .length,
    }),
    [documents, userId],
  );

  const filteredDocuments = useMemo(
    () =>
      documents
        .filter(
          (document) =>
            (filter === "all" ||
              (filter === "mine"
                ? document.ownerId === userId
                : document.ownerId !== userId)) &&
            document.title
              .toLocaleLowerCase()
              .includes(searchQuery.trim().toLocaleLowerCase()),
        )
        .sort((a, b) =>
          sort === "name"
            ? a.title.localeCompare(b.title)
            : sort === "oldest"
              ? new Date(a.updatedAt).getTime() -
                new Date(b.updatedAt).getTime()
              : new Date(b.updatedAt).getTime() -
                new Date(a.updatedAt).getTime(),
        ),
    [documents, filter, searchQuery, sort, userId],
  );

  const currentLabel =
    filters.find((item) => item.id === filter)?.label || "All documents";

  if (status !== "authenticated")
    return (
      <div
        role="status"
        className="flex min-h-screen items-center justify-center gap-3 bg-[#f7f8fa] text-sm text-slate-500"
      >
        <Loader2
          className="h-5 w-5 animate-spin text-[#167d72]"
          aria-hidden="true"
        />
        Opening your workspace…
      </div>
    );

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-[#162333] lg:pl-60">
      <a
        href="#documents-main"
        className="sr-only z-50 rounded-lg bg-white p-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to documents
      </a>
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-[#e3e7eb] bg-white lg:flex">
        <Link
          href="/"
          className="focus-ring mx-6 my-8 flex items-center gap-2.5 rounded-lg text-lg font-semibold tracking-tight"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#167d72] text-white">
            <FileText className="h-5 w-5" aria-hidden="true" />
          </span>
          collab
          <span className="-ml-1.5 font-normal text-slate-400">editor</span>
        </Link>
        <div className="mx-4 rounded-xl border border-slate-200 bg-[#f8faf9] px-3 py-3.5">
          <p className="truncate text-sm font-semibold">Personal workspace</p>
          <p className="mt-1 text-xs text-slate-500">
            Ideas come together here
          </p>
        </div>
        <nav aria-label="Document navigation" className="mt-8 px-3">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
            Workspace
          </p>
          {filters.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              aria-pressed={filter === id}
              className={`focus-ring mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors ${filter === id ? "bg-[#eaf3f1] font-medium text-[#167d72]" : "text-slate-600 hover:bg-slate-50"}`}
            >
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              {label}
              <span className="ml-auto text-xs tabular-nums">
                {loading || error ? "—" : counts[id]}
              </span>
            </button>
          ))}
        </nav>
        <div className="mx-6 mt-auto mb-6 border-t border-slate-100 pt-6">
          <p className="text-sm font-medium">Good ideas start with a page.</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Make a draft, find your words, and bring your team into the
            conversation.
          </p>
        </div>
        <div className="flex items-center gap-2.5 border-t border-slate-200 px-5 py-5">
          <Initials name={userName} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold">{userName}</p>
            <p className="mt-0.5 truncate text-[11px] text-slate-500">
              {session?.user?.email}
            </p>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            aria-label="Sign out"
            title="Sign out"
            className="focus-ring rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </aside>

      <header className="flex min-h-20 items-center justify-between gap-3 border-b border-[#e3e7eb] bg-white px-5 sm:px-8 lg:px-10">
        <div className="flex items-center gap-2.5 text-sm">
          <Link
            href="/"
            className="focus-ring flex items-center gap-2 rounded-md font-semibold lg:hidden"
          >
            <FileText className="h-5 w-5 text-[#167d72]" aria-hidden="true" />
            collab editor
          </Link>
          <span className="hidden text-slate-500 lg:inline">Workspace</span>
          <ChevronRight
            className="hidden h-3.5 w-3.5 text-slate-300 lg:inline"
            aria-hidden="true"
          />
          <span className="hidden font-medium lg:inline">Documents</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden text-xs text-slate-500 sm:inline">
            Your next great idea starts here.
          </span>
          <Initials name={userName} />
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            aria-label="Sign out"
            className="focus-ring rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      <main
        id="documents-main"
        className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 sm:py-10 lg:px-10"
      >
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#167d72]">
              A space for your ideas
            </p>
            <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.035em] sm:text-4xl">
              Let’s make something together.
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              A fresh page or a work in progress. Pick up wherever inspiration
              finds you.
            </p>
          </div>
          <button
            type="button"
            disabled={creating !== null}
            onClick={() => createDocument()}
            className="focus-ring inline-flex h-11 items-center gap-2 rounded-lg bg-[#167d72] px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#11675e] disabled:cursor-wait disabled:opacity-60"
          >
            {creating === "blank" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="h-4 w-4" aria-hidden="true" />
            )}
            {creating === "blank" ? "Creating…" : "New document"}
          </button>
        </div>

        <DocumentTemplates creating={creating} onCreate={createDocument} />

        <section aria-labelledby="documents-title" className="mt-11">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <h2
                id="documents-title"
                className="text-lg font-semibold tracking-tight"
              >
                {currentLabel}
              </h2>
              {!loading && !error && (
                <span className="rounded-md bg-[#e9edef] px-2 py-0.5 text-xs font-medium text-slate-600">
                  {counts[filter]}
                </span>
              )}
            </div>
            <p aria-live="polite" className="text-xs text-slate-500">
              {!loading &&
                !error &&
                (searchQuery.trim()
                  ? `${filteredDocuments.length} result${filteredDocuments.length !== 1 ? "s" : ""}`
                  : "Your words, all in one place")}
            </p>
          </div>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {filters.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-pressed={filter === id}
                onClick={() => setFilter(id)}
                className={`focus-ring shrink-0 rounded-lg border px-3 py-2 text-xs ${filter === id ? "border-[#bbd5cf] bg-[#eaf3f1] font-medium text-[#167d72]" : "border-slate-200 bg-white text-slate-500"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div className="relative min-w-0 flex-1 basis-60 sm:max-w-sm">
              <Search
                className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Search documents"
                placeholder="Search your documents…"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="focus-ring h-10 w-full rounded-lg border border-[#e0e5e9] bg-white pr-10 pl-10 text-sm placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery("")}
                  className="focus-ring absolute top-2 right-2 rounded p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="flex flex-1 items-center justify-end gap-2 sm:ml-auto sm:flex-none">
              <label htmlFor="document-sort" className="sr-only">
                Sort documents
              </label>
              <select
                id="document-sort"
                value={sort}
                onChange={(event) => setSort(event.target.value as Sort)}
                className="focus-ring h-10 max-w-full rounded-lg border border-[#e0e5e9] bg-white px-3 text-xs text-slate-600"
              >
                <option value="updated">Last edited</option>
                <option value="oldest">Oldest first</option>
                <option value="name">Name: A–Z</option>
              </select>
              <div className="flex h-10 items-center gap-0.5 rounded-lg border border-[#e0e5e9] bg-white p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid view"
                  aria-pressed={viewMode === "grid"}
                  className={`focus-ring rounded-md p-1.5 ${viewMode === "grid" ? "bg-[#eaf3f1] text-[#167d72]" : "text-slate-400 hover:bg-slate-50"}`}
                >
                  <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  aria-label="List view"
                  aria-pressed={viewMode === "list"}
                  className={`focus-ring rounded-md p-1.5 ${viewMode === "list" ? "bg-[#eaf3f1] text-[#167d72]" : "text-slate-400 hover:bg-slate-50"}`}
                >
                  <List className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div
              role="status"
              aria-label="Loading documents"
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  aria-hidden="true"
                  className="h-60 animate-pulse rounded-xl border border-slate-200 bg-white p-6"
                >
                  <div className="mb-7 h-10 w-9 rounded-lg bg-slate-100" />
                  <div className="mb-3 h-4 w-3/4 rounded bg-slate-100" />
                  <div className="mb-2 h-3 w-full rounded bg-slate-50" />
                  <div className="h-3 w-2/3 rounded bg-slate-50" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div
              role="alert"
              className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center"
            >
              <AlertCircle
                className="mx-auto mb-4 h-8 w-8 text-amber-600"
                aria-hidden="true"
              />
              <h3 className="font-semibold">Let’s try that again.</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {error}
              </p>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  void fetchDocuments();
                }}
                className="focus-ring mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Try again
              </button>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#d5dfdc] bg-white/70 px-6 py-14 text-center">
              <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eaf3f1] text-[#167d72]">
                {searchQuery.trim() ? (
                  <Search className="h-6 w-6" aria-hidden="true" />
                ) : filter === "shared" ? (
                  <Users className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <FilePlus2 className="h-6 w-6" aria-hidden="true" />
                )}
              </span>
              <h3 className="text-lg font-semibold">
                {searchQuery.trim()
                  ? "No matching documents"
                  : filter === "shared"
                    ? "Good work is better together."
                    : "Your next chapter starts here."}
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                {searchQuery.trim()
                  ? `We couldn’t find a document named “${searchQuery.trim()}”. Try a different title.`
                  : filter === "shared"
                    ? "When someone shares a document with your account, you’ll find it right here."
                    : "Start with a blank page, or use a template to give your ideas a head start."}
              </p>
              {searchQuery.trim() ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="focus-ring mt-5 rounded-lg px-3 py-2 text-sm font-medium text-[#167d72] hover:bg-[#eaf3f1]"
                >
                  Clear search
                </button>
              ) : (
                filter !== "shared" && (
                  <button
                    type="button"
                    disabled={creating !== null}
                    onClick={() => createDocument()}
                    className="focus-ring mt-5 inline-flex items-center gap-2 rounded-lg bg-[#167d72] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#11675e] disabled:opacity-60"
                  >
                    Create your first document
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                )
              )}
            </div>
          ) : (
            <DocumentCollection
              documents={filteredDocuments}
              viewMode={viewMode}
              userId={userId || ""}
              onDelete={setDocumentToDelete}
            />
          )}
        </section>
      </main>
      {documentToDelete && (
        <DeleteDocumentDialog
          document={documentToDelete}
          onClose={() => setDocumentToDelete(null)}
          onDeleted={(id) => {
            setDocuments((previous) =>
              previous.filter((document) => document.id !== id),
            );
            setDocumentToDelete(null);
            addToast("Document deleted", "success");
          }}
        />
      )}
    </div>
  );
}
