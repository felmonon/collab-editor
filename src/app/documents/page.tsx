"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  ChevronRight,
  Clock3,
  FilePlus2,
  FileText,
  FolderOpen,
  LayoutGrid,
  List,
  Loader2,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Users,
  X,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { BrandLogo } from "@/components/ui/brand";
import { AccountMenu } from "@/components/account/account-menu";
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
import { recoverExpiredSession, SESSION_RECOVERY_ERROR, signOutSafely } from "@/lib/auth-session-client";

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

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated" || !session?.user?.id)
    return (
      <div role="status" className="flex min-h-screen items-center justify-center gap-3 bg-[#f6f7fb] text-sm text-[#747985]">
        <Loader2 className="h-5 w-5 animate-spin text-[#315bee]" aria-hidden="true" />
        Opening your workspace…
      </div>
    );

  // A session change must never display the previous account's document list.
  return <DocumentsWorkspace key={session.user.id} user={session.user} />;
}

function DocumentsWorkspace({ user }: {
  user: { id: string; name?: string | null; email?: string | null };
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const [documents, setDocuments] = useState<WorkspaceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("updated");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [documentToDelete, setDocumentToDelete] =
    useState<WorkspaceDocument | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const mobileNavigation = useRef<HTMLDialogElement>(null);
  const active = useRef(false);
  const createRequest = useRef<AbortController | null>(null);
  const userId = user.id;
  const userName = user.name || "Your account";

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      createRequest.current?.abort();
    };
  }, []);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      const shortcut =
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k" &&
        !event.altKey;
      if (!shortcut || document.querySelector("dialog[open]")) return;
      event.preventDefault();
      searchInput.current?.focus();
      searchInput.current?.select();
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  useEffect(() => {
    const desktopViewport = window.matchMedia("(min-width: 1024px)");
    const closeMobileNavigation = () => {
      if (desktopViewport.matches) mobileNavigation.current?.close();
    };
    desktopViewport.addEventListener("change", closeMobileNavigation);
    return () =>
      desktopViewport.removeEventListener("change", closeMobileNavigation);
  }, []);

  const fetchDocuments = useCallback(
    (signal?: AbortSignal) => {
      return fetch("/api/documents", { signal })
        .then(async (response) => {
          if (!active.current || signal?.aborted) return;
          if (response.status === 401) {
            await recoverExpiredSession("/documents");
            return;
          }
          if (!response.ok) throw new Error("Failed to load documents");
          const data = await response.json();
          if (!Array.isArray(data)) throw new Error("Unexpected response");
          if (!active.current || signal?.aborted) return;
          setDocuments(data);
          setError("");
        })
        .catch((error) => {
          if (active.current && !signal?.aborted)
            setError(error instanceof Error && error.message === SESSION_RECOVERY_ERROR
              ? SESSION_RECOVERY_ERROR
              : "Your documents couldn’t be loaded. Check your connection and try again.");
        })
        .finally(() => {
          if (active.current && !signal?.aborted) setLoading(false);
        });
    },
    [],
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
    if (creating || createRequest.current) return;
    const controller = new AbortController();
    createRequest.current = controller;
    setCreating(template.id);
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: template.documentTitle,
          content: template.content,
        }),
      });
      if (!active.current || controller.signal.aborted) return;
      if (response.status === 401) {
        await recoverExpiredSession("/documents");
        return;
      }
      if (!response.ok) throw new Error("Failed to create document");
      const document = await response.json();
      if (!active.current || controller.signal.aborted) return;
      if (typeof document?.id !== "string" || !document.id)
        throw new Error("Invalid document response");
      router.push(`/documents/${document.id}`);
    } catch (error) {
      if (!active.current || controller.signal.aborted) return;
      addToast(error instanceof Error && error.message === SESSION_RECOVERY_ERROR
        ? SESSION_RECOVERY_ERROR
        : "Your document couldn’t be created. Please try again.", "error");
      setCreating(null);
    } finally {
      if (createRequest.current === controller) createRequest.current = null;
    }
  };

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError("");
    try {
      await signOutSafely();
    } catch {
      if (!active.current) return;
      setSigningOut(false);
      setSignOutError("Couldn’t sign out. Check your connection and try again.");
    }
  }

  const counts = useMemo(
    () => ({
      all: documents.length,
      mine: documents.filter((document) => document.ownerId === userId).length,
      shared: documents.filter((document) => document.ownerId !== userId)
        .length,
    }),
    [documents, userId],
  );

  const recentDocuments = useMemo(
    () =>
      [...documents]
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        .slice(0, 4),
    [documents],
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
  const focusSearch = () => {
    mobileNavigation.current?.close();
    searchInput.current?.focus();
    searchInput.current?.select();
  };
  const selectFilter = (nextFilter: Filter) => {
    setFilter(nextFilter);
    mobileNavigation.current?.close();
  };

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between px-6 pt-7 pb-8">
        <Link
          href="/"
          aria-label="Collab Editor home"
          className="focus-ring rounded-lg"
        >
          <BrandLogo inverted />
        </Link>
        <button
          type="button"
          onClick={() => mobileNavigation.current?.close()}
          aria-label="Close navigation"
          className="focus-ring rounded-lg p-2 text-[#9ca3b5] hover:bg-white/5 hover:text-white lg:hidden"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="px-4">
        <div className="mb-5 flex items-center gap-2.5 rounded-lg border border-[#343641] bg-[#22252e] px-3 py-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#3a3f50] text-[10px] font-semibold text-[#cbd1e0]">
            {userName.trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-medium text-[#f0f1f6]">
              Personal workspace
            </p>
            <p className="mt-0.5 text-[11px] text-[#a5adbe]">
              A home for your ideas
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={focusSearch}
          className="focus-ring flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-left text-[12px] text-[#a5adbe] transition-colors hover:bg-white/5 hover:text-white"
        >
          <Search size={15} aria-hidden="true" />
          Quick search
          <kbd className="ml-auto rounded border border-[#3b3e4b] px-1.5 font-sans text-[10px] leading-4 text-[#a5adbe]">
            Ctrl K
          </kbd>
        </button>
      </div>
      <nav aria-label="Document navigation" className="mt-7 px-3">
        <p className="mb-3 px-3 text-[10px] font-medium uppercase tracking-[0.13em] text-[#a5adbe]">
          Workspace
        </p>
        {filters.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => selectFilter(id)}
            aria-pressed={filter === id}
            className={`focus-ring mb-1 flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-[12px] transition-colors ${filter === id ? "bg-[#30384f] font-medium text-[#dbe4ff]" : "text-[#a5adbe] hover:bg-white/5 hover:text-[#e6e9f0]"}`}
          >
            <Icon
              size={16}
              className={filter === id ? "text-[#8daaff]" : "text-[#777f92]"}
              aria-hidden="true"
            />
            {label}
            <span
              className={`ml-auto min-w-5 rounded px-1 text-[10px] tabular-nums ${filter === id ? "bg-[#434d68] text-[#c9d7ff]" : "text-[#a5adbe]"}`}
            >
              {loading || error ? "—" : counts[id]}
            </span>
          </button>
        ))}
      </nav>
      {!loading && !error && recentDocuments.length > 0 && (
        <nav aria-label="Recently edited documents" className="mt-8 px-3">
          <p className="mb-3 flex items-center gap-1.5 px-3 text-[10px] font-medium uppercase tracking-[0.13em] text-[#a5adbe]">
            <Clock3 size={11} aria-hidden="true" />
            Recently edited
          </p>
          {recentDocuments.map((document) => (
            <Link
              key={document.id}
              href={`/documents/${document.id}`}
              onClick={() => mobileNavigation.current?.close()}
              title={document.title}
              className="focus-ring flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[12px] text-[#a5adbe] hover:bg-white/5 hover:text-[#dce2f0]"
            >
              <FileText
                size={14}
                className="shrink-0 text-[#616b81]"
                aria-hidden="true"
              />
              <span className="truncate">{document.title}</span>
            </Link>
          ))}
        </nav>
      )}
      <div className="mt-auto px-5 pt-10 pb-5">
        <div className="mb-5 border-t border-[#30333e] pt-5">
          <p className="text-[11px] font-medium text-[#b8bfce]">
            A little space. A lot of possibility.
          </p>
          <p className="mt-1.5 text-[11px] leading-[18px] text-[#a5adbe]">
            For first drafts and the ideas that follow.
          </p>
        </div>
        <Link
          href="/account"
          onClick={() => mobileNavigation.current?.close()}
          className="focus-ring -mx-1 mb-4 flex min-h-10 items-center gap-2.5 rounded-lg px-2 text-xs text-[#a5adbe] hover:bg-white/5 hover:text-white"
        >
          <Settings2 size={15} aria-hidden="true" />
          Account settings
        </Link>
        {signOutError && <p role="alert" className="mb-3 text-xs leading-5 text-red-200">{signOutError}</p>}
        <div className="flex items-center gap-2.5">
          <Initials name={userName} inverted />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium text-[#dce1eb]">
              {userName}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-[#a5adbe]">
              {user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            aria-label={signingOut ? "Signing out…" : "Sign out"}
            title={signingOut ? "Signing out…" : "Sign out"}
            className="focus-ring rounded-lg p-2 text-[#6d778c] hover:bg-white/5 hover:text-white disabled:cursor-wait disabled:opacity-60"
          >
            {signingOut ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <LogOut size={15} aria-hidden="true" />}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-[#171923] lg:pl-[232px]">
      <a
        href="#documents-main"
        className="sr-only z-50 rounded-lg bg-white p-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to documents
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col overflow-y-auto bg-[#191b23] lg:flex">
        {sidebarContent}
      </aside>
      <dialog
        ref={mobileNavigation}
        aria-label="Workspace navigation"
        onClick={(event) => {
          if (event.target === event.currentTarget)
            mobileNavigation.current?.close();
        }}
        className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-[280px] max-w-[85vw] border-0 bg-[#191b23] p-0 text-white backdrop:bg-[#171923]/45"
      >
        <div className="flex min-h-full flex-col">{sidebarContent}</div>
      </dialog>
      <header className="flex h-[65px] items-center justify-between gap-3 border-b border-[#e6e8ef] bg-white px-5 sm:px-8 lg:px-10">
        <div className="flex min-w-0 items-center gap-2.5 text-[12px]">
          <button
            type="button"
            onClick={() => mobileNavigation.current?.showModal()}
            aria-label="Open navigation"
            className="focus-ring -ml-2 rounded-lg p-2 text-[#747985] hover:bg-[#f3f5fb] lg:hidden"
          >
            <Menu size={19} aria-hidden="true" />
          </button>
          <span className="hidden text-[#626977] sm:inline">Workspace</span>
          <ChevronRight
            size={13}
            className="hidden text-[#c6cad5] sm:inline"
            aria-hidden="true"
          />
          <span className="truncate font-medium text-[#565c6c]">
            {currentLabel}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={focusSearch}
            aria-label="Find a document"
            className="focus-ring hidden items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-[#626977] hover:bg-[#f5f6fb] sm:flex"
          >
            <Search size={13} aria-hidden="true" />
            <span>Find a document</span>
            <kbd className="ml-2 rounded border border-[#e6e8ef] px-1.5 text-[10px] leading-4">
              Ctrl K
            </kbd>
          </button>
          <div
            className="hidden h-5 w-px bg-[#e9ebf2] sm:block"
            aria-hidden="true"
          />
          <AccountMenu name={userName} email={user.email} />
        </div>
      </header>

      <main
        id="documents-main"
        className="mx-auto max-w-[1376px] px-5 pt-8 pb-12 sm:px-8 sm:pt-10 lg:px-10 xl:px-12 xl:pt-11"
      >
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#626977]">
              Your writing studio
            </p>
            <h1 className="text-[30px] font-semibold leading-[1.15] tracking-[-0.045em] sm:text-[36px]">
              Room for your next idea.
            </h1>
            <p className="mt-3 text-[13px] leading-6 text-[#626977]">
              Start a fresh page, or pick up right where you left off.
            </p>
          </div>
          <button
            type="button"
            disabled={creating !== null}
            onClick={() => createDocument()}
            className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg bg-[#315bee] px-4 text-[12px] font-medium text-white shadow-[0_3px_7px_#315bee22] transition-colors hover:bg-[#264bd4] disabled:cursor-wait disabled:opacity-60"
          >
            {creating === "blank" ? (
              <Loader2 size={15} className="animate-spin" aria-hidden="true" />
            ) : (
              <Plus size={15} aria-hidden="true" />
            )}
            {creating === "blank" ? "Creating…" : "New document"}
          </button>
        </div>
        <DocumentTemplates creating={creating} onCreate={createDocument} />

        <section aria-labelledby="documents-title" className="mt-10">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <h2
                id="documents-title"
                className="text-[16px] font-semibold tracking-[-0.025em]"
              >
                {currentLabel}
              </h2>
              {!loading && !error && (
                <span className="rounded-md bg-[#e9ecf5] px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-[#626977]">
                  {counts[filter]}
                </span>
              )}
            </div>
            <p aria-live="polite" className="text-[12px] text-[#626977]">
              {!loading &&
                !error &&
                (searchQuery.trim()
                  ? `${filteredDocuments.length} result${filteredDocuments.length !== 1 ? "s" : ""}`
                  : `${counts[filter]} document${counts[filter] !== 1 ? "s" : ""}`)}
            </p>
          </div>
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {filters.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-pressed={filter === id}
                onClick={() => setFilter(id)}
                className={`focus-ring shrink-0 rounded-md border px-2.5 py-2 text-[12px] ${filter === id ? "border-[#d4dcfb] bg-[#eaf0ff] font-medium text-[#315bee]" : "border-[#e6e8ef] bg-white text-[#626977]"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div className="relative min-w-0 flex-1 basis-60 sm:max-w-[320px]">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-[12px] text-[#a6acb9]"
                aria-hidden="true"
              />
              <input
                ref={searchInput}
                type="search"
                aria-label="Search documents"
                aria-keyshortcuts="Control+k Meta+k"
                placeholder="Search documents…"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="focus-ring h-10 w-full rounded-lg border border-[#e3e6ef] bg-white pr-16 pl-9 text-[12px] placeholder:text-[#626977]"
              />
              {searchQuery ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery("")}
                  className="focus-ring absolute top-2 right-2 rounded p-1 text-[#626977] hover:text-[#315bee]"
                >
                  <X size={15} aria-hidden="true" />
                </button>
              ) : (
                <kbd
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-[10px] rounded border border-[#e9ebf2] px-1.5 text-[10px] leading-4 text-[#626977]"
                >
                  Ctrl K
                </kbd>
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
                className="focus-ring h-10 max-w-full rounded-lg border border-[#e3e6ef] bg-white px-3 text-[12px] text-[#626977]"
              >
                <option value="updated">Last edited</option>
                <option value="oldest">Oldest first</option>
                <option value="name">Name: A–Z</option>
              </select>
              <div className="flex h-10 items-center gap-0.5 rounded-lg border border-[#e3e6ef] bg-white p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid view"
                  aria-pressed={viewMode === "grid"}
                  className={`focus-ring rounded-md p-1.5 ${viewMode === "grid" ? "bg-[#edf1ff] text-[#315bee]" : "text-[#747c8c] hover:bg-[#f5f6fb]"}`}
                >
                  <LayoutGrid size={15} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  aria-label="List view"
                  aria-pressed={viewMode === "list"}
                  className={`focus-ring rounded-md p-1.5 ${viewMode === "list" ? "bg-[#edf1ff] text-[#315bee]" : "text-[#747c8c] hover:bg-[#f5f6fb]"}`}
                >
                  <List size={15} aria-hidden="true" />
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
                  className="animate-pulse rounded-xl border border-[#e6e8ef] bg-white p-2.5"
                >
                  <div className="mb-5 h-[164px] rounded-lg bg-[#f1f3f8]" />
                  <div className="mx-2.5 mb-3 h-3 w-2/3 rounded bg-[#eff1f7]" />
                  <div className="mx-2.5 mb-3 h-2.5 w-1/3 rounded bg-[#f4f5f9]" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div
              role="alert"
              className="rounded-xl border border-[#e6e8ef] bg-white px-6 py-14 text-center"
            >
              <span className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#fff4e8] text-[#bf8b48]">
                <AlertCircle size={23} aria-hidden="true" />
              </span>
              <h3 className="text-[16px] font-semibold">
                Your workspace is taking a moment.
              </h3>
              <p className="mx-auto mt-2 max-w-md text-[13px] leading-6 text-[#626977]">
                {error}
              </p>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  void fetchDocuments();
                }}
                className="focus-ring mt-5 inline-flex items-center gap-2 rounded-lg border border-[#e2e6ef] px-4 py-2.5 text-[12px] font-medium text-[#626a7d] hover:bg-[#f5f6fb]"
              >
                <RefreshCw size={14} aria-hidden="true" />
                Try again
              </button>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="rounded-xl border border-[#e6e8ef] bg-white px-6 py-14 text-center">
              <div className="relative mx-auto mb-6 flex h-[76px] w-[80px] items-center justify-center">
                <span
                  aria-hidden="true"
                  className="absolute left-1 top-2 h-[62px] w-[48px] rotate-[-11deg] rounded-md border border-[#e0e6f7] bg-[#edf1fb]"
                />
                <span className="relative flex h-[66px] w-[50px] rotate-[6deg] items-center justify-center rounded-md border border-[#e0e6f7] bg-white text-[#8da1de] shadow-[0_3px_8px_#293c8508]">
                  {searchQuery.trim() ? (
                    <Search size={21} aria-hidden="true" />
                  ) : filter === "shared" ? (
                    <Users size={21} aria-hidden="true" />
                  ) : (
                    <FilePlus2 size={21} aria-hidden="true" />
                  )}
                </span>
              </div>
              <h3 className="text-[17px] font-semibold tracking-[-0.02em]">
                {searchQuery.trim()
                  ? "No documents found"
                  : filter === "shared"
                    ? "Great ideas are a team effort."
                    : "A fresh start, just for you."}
              </h3>
              <p className="mx-auto mt-2 max-w-sm break-words text-[13px] leading-6 text-[#626977]">
                {searchQuery.trim()
                  ? `Nothing matches “${searchQuery.trim()}”. Try another document title.`
                  : filter === "shared"
                    ? "Documents shared with your account will appear here. Your next collaboration is one invitation away."
                    : "Every great idea begins somewhere. Open a blank page or choose a template above."}
              </p>
              {searchQuery.trim() ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="focus-ring mt-5 rounded-lg px-3 py-2 text-[12px] font-medium text-[#315bee] hover:bg-[#edf1ff]"
                >
                  Clear search
                </button>
              ) : filter !== "shared" ? (
                <button
                  type="button"
                  disabled={creating !== null}
                  onClick={() => createDocument()}
                  className="focus-ring mt-5 inline-flex items-center gap-2 rounded-lg bg-[#315bee] px-4 py-2.5 text-[12px] font-medium text-white hover:bg-[#264bd4] disabled:opacity-60"
                >
                  Create your first document
                  <ArrowRight size={14} aria-hidden="true" />
                </button>
              ) : counts.all > 0 ? (
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className="focus-ring mt-5 rounded-lg px-3 py-2 text-[12px] font-medium text-[#315bee] hover:bg-[#edf1ff]"
                >
                  View all documents
                </button>
              ) : null}
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
          onSessionExpired={() => recoverExpiredSession("/documents")}
          onDeleted={(id, confirmedDeletion) => {
            setDocuments((previous) =>
              previous.filter((document) => document.id !== id),
            );
            setDocumentToDelete(null);
            addToast(confirmedDeletion ? "Document deleted" : "This document is no longer available in your workspace.", "success");
          }}
        />
      )}
    </div>
  );
}
