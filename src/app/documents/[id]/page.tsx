"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CloudOff,
  Feather,
  Loader2,
  LockKeyhole,
  RefreshCw,
  Share2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { ShareDialog } from "@/components/editor/share-dialog";
import { useSocket } from "@/lib/socket/use-socket";
import {
  reconcileSavedDraft,
  type EditorDraft,
  type SavedEditorDraft,
} from "@/lib/editor-save";

interface DocumentRecord {
  id: string;
  title: string;
  content: string | null;
  updatedAt: string;
  canEdit: boolean;
  isOwner: boolean;
}
type SaveStatus = "saved" | "unsaved" | "saving" | "error" | "conflict";
const CONFLICT_MESSAGE =
  "A collaborator saved a newer version. Your draft is still here. Download it before loading their changes.";

export default function DocumentPage() {
  const { id } = useParams<{ id: string }>();
  return <DocumentRoom key={id} documentId={id} />;
}

function DocumentRoom({ documentId: id }: { documentId: string }) {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [record, setRecord] = useState<DocumentRecord | null>(null);
  const [draft, setDraft] = useState<EditorDraft>({ title: "", content: "" });
  const draftRef = useRef(draft);
  const revisionRef = useRef("");
  const dirtyRef = useRef(false);
  const inFlightRef = useRef<AbortController | null>(null);
  const pendingRemoteRef = useRef<SavedEditorDraft | null>(null);
  const generationRef = useRef(0);
  const loadingRef = useRef(true);
  const [loading, setLoading] = useState(true);
  const statusRef = useRef<SaveStatus>("saved");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [reloadCount, setReloadCount] = useState(0);
  const [sharing, setSharing] = useState(false);
  function updateStatus(next: SaveStatus) {
    statusRef.current = next;
    setSaveStatus(next);
  }

  const handleRemoteContent = useCallback(
    (content: string, updatedAt?: string, title?: string) => {
      if (!updatedAt || updatedAt <= revisionRef.current) return;
      const remote = {
        content,
        title: title ?? draftRef.current.title,
        updatedAt,
      };
      if (
        pendingRemoteRef.current &&
        pendingRemoteRef.current.updatedAt >= updatedAt
      )
        return;
      if (loadingRef.current || inFlightRef.current) {
        // The pending HTTP response may be older than this notification.
        pendingRemoteRef.current = remote;
        return;
      }
      if (dirtyRef.current) {
        pendingRemoteRef.current = remote;
        statusRef.current = "conflict";
        setSaveStatus("conflict");
        setSaveError(CONFLICT_MESSAGE);
        return;
      }
      revisionRef.current = updatedAt;
      const next = { title: remote.title, content };
      pendingRemoteRef.current = null;
      draftRef.current = next;
      setDraft(next);
      statusRef.current = "saved";
      setSaveStatus("saved");
    },
    [],
  );

  const { connected, users, sendUpdate } = useSocket({
    documentId: id,
    user: { id: session?.user?.id || "", name: session?.user?.name || "You" },
    enabled: Boolean(record && session?.user?.id),
    onDocumentUpdate: handleRemoteContent,
  });

  useEffect(() => {
    if (sessionStatus === "unauthenticated")
      router.replace(
        `/login?callbackUrl=${encodeURIComponent(`/documents/${id}`)}`,
      );
  }, [sessionStatus, router, id]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const controller = new AbortController();
    const generation = ++generationRef.current;
    loadingRef.current = true;
    pendingRemoteRef.current = null;
    inFlightRef.current?.abort();
    inFlightRef.current = null;
    async function load() {
      try {
        const res = await fetch(`/api/documents/${id}`, {
          signal: controller.signal,
        });
        if (!res.ok)
          throw new Error(
            res.status === 404
              ? "This document is unavailable, or you don’t have access."
              : "We couldn’t load this document. Please try again.",
          );
        const data: DocumentRecord = await res.json();
        if (controller.signal.aborted || generation !== generationRef.current)
          return;
        const newerRemote =
          pendingRemoteRef.current &&
          pendingRemoteRef.current.updatedAt > data.updatedAt
            ? pendingRemoteRef.current
            : null;
        const next = newerRemote
          ? { title: newerRemote.title, content: newerRemote.content }
          : {
              title: data.title,
              content: typeof data.content === "string" ? data.content : "",
            };
        pendingRemoteRef.current = null;
        draftRef.current = next;
        revisionRef.current = newerRemote?.updatedAt ?? data.updatedAt;
        dirtyRef.current = false;
        setDraft(next);
        setRecord(data);
        setLoadError("");
        setSaveError("");
        statusRef.current = "saved";
        setSaveStatus("saved");
      } catch (error) {
        if (!controller.signal.aborted && generation === generationRef.current)
          setLoadError(
            error instanceof Error ? error.message : "Couldn’t load document.",
          );
      } finally {
        if (
          !controller.signal.aborted &&
          generation === generationRef.current
        ) {
          loadingRef.current = false;
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      controller.abort();
      generationRef.current += 1;
      inFlightRef.current?.abort();
      inFlightRef.current = null;
    };
  }, [id, session?.user?.id, reloadCount]);

  const save = useCallback(async () => {
    if (
      loadingRef.current ||
      !record?.canEdit ||
      !dirtyRef.current ||
      inFlightRef.current ||
      statusRef.current === "conflict"
    )
      return;
    const snapshot = { ...draftRef.current };
    const generation = generationRef.current;
    const controller = new AbortController();
    inFlightRef.current = controller;
    statusRef.current = "saving";
    setSaveStatus("saving");
    setSaveError("");
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...snapshot,
          title: snapshot.title.trim() || "Untitled document",
          expectedUpdatedAt: revisionRef.current,
        }),
      });
      const data = await res.json();
      if (controller.signal.aborted || generation !== generationRef.current)
        return;
      if (res.status === 409) {
        statusRef.current = "conflict";
        setSaveStatus("conflict");
        setSaveError(
          "A newer version was saved elsewhere. Your draft is still here. Download it before loading the latest version.",
        );
        return;
      }
      if (!res.ok)
        throw new Error(
          data.error || "Your changes couldn’t be saved. Please retry.",
        );
      const resolved = reconcileSavedDraft({
        submitted: snapshot,
        current: draftRef.current,
        saved: {
          title: data.title,
          content:
            typeof data.content === "string" ? data.content : snapshot.content,
          updatedAt: data.updatedAt,
        },
        remote: pendingRemoteRef.current,
      });
      revisionRef.current = resolved.revision;
      dirtyRef.current = resolved.dirty;
      draftRef.current = resolved.draft;
      setDraft(resolved.draft);
      pendingRemoteRef.current = resolved.pendingRemote;
      statusRef.current = resolved.status;
      setSaveStatus(resolved.status);
      setSaveError(resolved.status === "conflict" ? CONFLICT_MESSAGE : "");
      sendUpdate(snapshot.content, data.updatedAt, data.title);
    } catch (error) {
      if (!controller.signal.aborted && generation === generationRef.current) {
        const conflict = Boolean(
          pendingRemoteRef.current &&
          pendingRemoteRef.current.updatedAt > revisionRef.current,
        );
        statusRef.current = conflict ? "conflict" : "error";
        setSaveStatus(statusRef.current);
        setSaveError(
          conflict
            ? CONFLICT_MESSAGE
            : error instanceof Error
              ? error.message
              : "Couldn’t save. Check your connection and retry.",
        );
      }
    } finally {
      if (inFlightRef.current === controller) inFlightRef.current = null;
    }
  }, [id, record?.canEdit, sendUpdate]);

  useEffect(() => {
    if (saveStatus !== "unsaved") return;
    const timer = setTimeout(() => void save(), 1000);
    return () => clearTimeout(timer);
  }, [draft, saveStatus, save]);

  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (dirtyRef.current) {
        event.preventDefault();
      }
    }
    function keyboardSave(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "s") {
        event.preventDefault();
        void save();
      }
    }
    function retryOnline() {
      if (statusRef.current === "error") void save();
    }
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("keydown", keyboardSave);
    window.addEventListener("online", retryOnline);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("keydown", keyboardSave);
      window.removeEventListener("online", retryOnline);
    };
  }, [save]);

  function edit(next: EditorDraft) {
    if (loadingRef.current || !record?.canEdit) return;
    draftRef.current = next;
    dirtyRef.current = true;
    setDraft(next);
    if (statusRef.current !== "conflict" && statusRef.current !== "saving")
      updateStatus("unsaved");
  }
  function leave() {
    if (
      dirtyRef.current &&
      !window.confirm(
        "Your latest changes haven’t been saved. Leave this document anyway?",
      )
    )
      return;
    router.push("/documents");
  }
  function reloadLatest() {
    if (
      dirtyRef.current &&
      !window.confirm(
        "Replace your local draft with the latest saved version? Download your draft first if you want to keep it.",
      )
    )
      return;
    loadingRef.current = true;
    setLoading(true);
    setReloadCount((count) => count + 1);
  }

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 bg-[#f7f8fa] text-sm text-slate-500">
        <Loader2 size={20} className="animate-spin text-teal-700" /> Opening
        your document…
      </div>
    );
  if (loadError)
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8fa] p-6">
        <div className="max-w-md text-center">
          <CloudOff className="mx-auto mb-5 text-teal-700" size={36} />
          <h1 className="text-2xl font-semibold">
            Let’s get you back to writing.
          </h1>
          <p role="alert" className="my-4 text-sm leading-6 text-slate-500">
            {loadError}
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/documents"
              className="rounded-lg border bg-white px-4 py-2 text-sm"
            >
              All documents
            </Link>
            <button
              onClick={() => setReloadCount((count) => count + 1)}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm text-white"
            >
              Try again
            </button>
          </div>
        </div>
      </main>
    );
  if (!record)
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 bg-[#f7f8fa] text-sm text-slate-500">
        <Loader2 size={20} className="animate-spin text-teal-700" /> Opening
        your document…
      </div>
    );

  return (
    <div className="min-h-screen bg-[#f5f6f7]">
      <header className="sticky top-0 z-30 h-[73px] border-b bg-white">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <button
              onClick={leave}
              aria-label="Back to documents"
              className="rounded-md p-2 text-slate-400 hover:bg-slate-50"
            >
              <ArrowLeft size={18} />
            </button>
            <span className="hidden items-center gap-2 font-semibold tracking-tight text-[#162333] sm:flex">
              <Feather size={22} className="text-teal-700" /> collab
              <span className="text-teal-700">.</span>
            </span>
            <span className="hidden h-5 w-px bg-slate-200 sm:block" />
            <span className="max-w-[150px] truncate text-sm text-slate-600 sm:max-w-xs">
              {draft.title || "Untitled document"}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-3 sm:gap-5">
            <span
              role="status"
              aria-live="polite"
              className={`hidden items-center gap-1.5 text-xs sm:flex ${saveStatus === "error" || saveStatus === "conflict" ? "text-amber-700" : "text-slate-500"}`}
            >
              {saveStatus === "saving" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : saveStatus === "saved" ? (
                <Check size={14} className="text-teal-700" />
              ) : (
                <CloudOff size={14} />
              )}
              {!record.canEdit
                ? "View only"
                : {
                    saved: "All changes saved",
                    unsaved: "Unsaved changes",
                    saving: "Saving…",
                    error: "Not saved",
                    conflict: "Review changes",
                  }[saveStatus]}
            </span>
            <div
              className="hidden -space-x-2 md:flex"
              aria-label={`${users.length} connected collaborators`}
            >
              {users.slice(0, 3).map((user) => (
                <span
                  key={user.id}
                  title={user.name}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-medium text-white"
                  style={{ backgroundColor: user.color }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </span>
              ))}
            </div>
            {record.isOwner && (
              <button
                onClick={() => setSharing(true)}
                className="flex items-center gap-2 rounded-lg bg-[#167d72] px-4 py-2.5 text-xs font-medium text-white hover:bg-[#12695f]"
              >
                <Share2 size={14} /> Share
              </button>
            )}
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-2 px-6 py-5 text-xs text-slate-500">
        <span className="flex items-center gap-2">
          <LockKeyhole size={13} />{" "}
          {record.isOwner ? "Your workspace" : "Shared with you"}{" "}
          <span className="mx-1 text-slate-300">/</span>{" "}
          {record.canEdit ? "Editing" : "Viewing"}
        </span>
        <span className="flex items-center gap-1.5">
          {connected ? (
            <Wifi size={14} className="text-teal-700" />
          ) : (
            <WifiOff size={14} />
          )}
          {connected
            ? "Live collaboration connected"
            : "Live collaboration unavailable"}
        </span>
      </div>
      {saveError && (
        <div
          role="alert"
          className="mx-auto mb-5 flex max-w-4xl flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <p className="flex-1">{saveError}</p>
          <button
            disabled={saveStatus === "saving"}
            onClick={
              saveStatus === "conflict" ? reloadLatest : () => void save()
            }
            className="flex items-center gap-2 rounded-md border border-amber-300 px-3 py-2 text-xs font-semibold disabled:opacity-50"
          >
            <RefreshCw size={13} />
            {saveStatus === "conflict" ? "Load latest version" : "Retry save"}
          </button>
        </div>
      )}
      <TiptapEditor
        content={draft.content}
        title={draft.title}
        onTitleChange={(title) => edit({ ...draftRef.current, title })}
        onUpdate={(content) => edit({ ...draftRef.current, content })}
        editable={record.canEdit}
      />
      {sharing && (
        <ShareDialog documentId={id} onClose={() => setSharing(false)} />
      )}
    </div>
  );
}
