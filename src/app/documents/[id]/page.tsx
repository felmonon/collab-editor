"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CloudOff,
  Loader2,
  LockKeyhole,
  RefreshCw,
  Share2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { BrandLogo } from "@/components/ui/brand";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { ShareDialog } from "@/components/editor/share-dialog";
import { useSocket } from "@/lib/socket/use-socket";
import {
  reconcileSavedDraft,
  type EditorDraft,
  type SavedEditorDraft,
} from "@/lib/editor-save";
import { draftRecovery, reconcileRecoveredDraft } from "@/lib/editor-recovery";

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
  const discardRecoveryRef = useRef(false);
  const generationRef = useRef(0);
  const loadingRef = useRef(true);
  const [loading, setLoading] = useState(true);
  const statusRef = useRef<SaveStatus>("saved");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [reloadCount, setReloadCount] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [recoveryNotice, setRecoveryNotice] = useState("");
  const [recoveryUnavailable, setRecoveryUnavailable] = useState(false);
  const userId = session?.user?.id;
  const rememberDraft = useCallback(
    (next: EditorDraft, baseRevision: string) => {
      if (!userId) return;
      setRecoveryUnavailable(
        !draftRecovery.write(userId, id, { draft: next, baseRevision }),
      );
    },
    [userId, id],
  );
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

  const { connected, users, sendUpdate, connectionError, reconnect } =
    useSocket({
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
    if (!userId) return;
    const recoveryUserId: string = userId;
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
        const saved = newerRemote ?? {
          title: data.title,
          content: typeof data.content === "string" ? data.content : "",
          updatedAt: data.updatedAt,
        };
        const recovered = reconcileRecoveredDraft(
          saved,
          discardRecoveryRef.current
            ? null
            : draftRecovery.read(recoveryUserId, id),
        );
        discardRecoveryRef.current = false;
        const hasPendingDraft = recovered.status !== "saved";
        const nextStatus =
          hasPendingDraft && !data.canEdit ? "conflict" : recovered.status;
        pendingRemoteRef.current = nextStatus === "conflict" ? saved : null;
        draftRef.current = recovered.draft;
        revisionRef.current = recovered.revision;
        dirtyRef.current = hasPendingDraft;
        if (hasPendingDraft) {
          rememberDraft(recovered.draft, recovered.revision);
        } else {
          draftRecovery.clear(recoveryUserId, id);
          setRecoveryUnavailable(false);
        }
        setDraft(recovered.draft);
        setRecord(data);
        setLoadError("");
        setRecoveryNotice(
          hasPendingDraft
            ? "Recovered your unsaved changes from this tab."
            : "",
        );
        setSaveError(
          nextStatus === "conflict"
            ? !data.canEdit
              ? "Your unsaved draft is still here, but you now have view-only access. Download it before loading the saved version."
              : CONFLICT_MESSAGE
            : "",
        );
        statusRef.current = nextStatus;
        setSaveStatus(nextStatus);
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
  }, [id, userId, reloadCount, rememberDraft]);

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
      if (resolved.dirty) {
        // An earlier save must not erase newer edits made while it was pending.
        rememberDraft(resolved.draft, resolved.revision);
      } else if (userId) {
        draftRecovery.clear(userId, id);
        setRecoveryUnavailable(false);
      }
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
  }, [id, userId, record?.canEdit, sendUpdate, rememberDraft]);

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
    // Persist synchronously: browser Back can unmount us before autosave runs.
    rememberDraft(next, revisionRef.current);
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
    // Keep the backup until the replacement actually loads successfully.
    discardRecoveryRef.current = true;
    loadingRef.current = true;
    setLoading(true);
    setReloadCount((count) => count + 1);
  }

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 bg-[#f6f7fb] text-sm text-slate-500">
        <Loader2 size={20} className="animate-spin text-[#315bee]" /> Opening
        your document…
      </div>
    );
  if (loadError)
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f7fb] p-6">
        <div className="max-w-md text-center">
          <CloudOff className="mx-auto mb-5 text-[#315bee]" size={36} />
          <h1 className="text-2xl font-semibold">
            Let’s get you back to writing.
          </h1>
          <p role="alert" className="my-4 text-sm leading-6 text-slate-500">
            {loadError}
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/documents"
              className="min-h-11 rounded-xl border border-[#e6e8ef] bg-white px-4 py-3 text-sm"
            >
              All documents
            </Link>
            <button
              onClick={() => setReloadCount((count) => count + 1)}
              className="min-h-11 rounded-xl bg-[#315bee] px-4 py-3 text-sm font-medium text-white"
            >
              Try again
            </button>
          </div>
        </div>
      </main>
    );
  if (!record)
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 bg-[#f6f7fb] text-sm text-slate-500">
        <Loader2 size={20} className="animate-spin text-[#315bee]" /> Opening
        your document…
      </div>
    );

  const saveLabel = !record.canEdit
    ? "View only"
    : {
        saved: "All changes saved",
        unsaved: "Unsaved changes",
        saving: "Saving…",
        error: "Not saved",
        conflict: "Review changes",
      }[saveStatus];
  const liveConnected = connected && !connectionError;

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-[#171923]">
      <header className="sticky top-0 z-30 h-16 border-b border-[#e6e8ef] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-3 px-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <button
              onClick={leave}
              aria-label="Back to documents"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#626977] transition-colors hover:bg-[#f6f7fb] hover:text-[#171923] focus-visible:outline-2 focus-visible:outline-[#315bee]"
            >
              <ArrowLeft size={18} />
            </button>
            <span className="hidden md:block">
              <BrandLogo compact />
            </span>
            <span
              aria-hidden="true"
              className="hidden h-6 w-px bg-[#e6e8ef] md:block"
            />
            <div className="min-w-0">
              <p className="mb-0.5 hidden text-[10px] font-medium uppercase tracking-[.1em] text-[#626977] sm:block">
                {record.isOwner ? "My workspace" : "Shared with me"}
              </p>
              <p className="max-w-[42vw] truncate text-[13px] font-medium text-[#353b49] sm:max-w-xs lg:max-w-md">
                {draft.title || "Untitled document"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 sm:gap-5">
            <span
              role="status"
              aria-live="polite"
              className={`hidden items-center gap-1.5 text-[11px] lg:flex ${saveStatus === "error" || saveStatus === "conflict" ? "text-amber-700" : "text-[#626977]"}`}
            >
              {saveStatus === "saving" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : saveStatus === "saved" ? (
                <Check size={14} className="text-[#315bee]" />
              ) : (
                <CloudOff size={14} />
              )}
              {saveLabel}
            </span>
            <div
              className="hidden -space-x-2 md:flex"
              aria-label={`${users.length} connected collaborators`}
            >
              {users.slice(0, 3).map((user) => (
                <span
                  key={user.id}
                  title={user.name}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[11px] font-semibold text-white ring-1 ring-black/5"
                  style={{ backgroundColor: user.color }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </span>
              ))}
              {users.length > 3 && (
                <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#eef2ff] text-[10px] font-semibold text-[#315bee]">
                  +{users.length - 3}
                </span>
              )}
            </div>
            {record.isOwner && (
              <button
                onClick={() => setSharing(true)}
                className="flex min-h-11 items-center gap-2 rounded-xl bg-[#315bee] px-4 text-xs font-semibold text-white shadow-[0_2px_6px_#315bee25] transition-colors hover:bg-[#244bd5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315bee]"
              >
                <Share2 size={14} /> Share
              </button>
            )}
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4 text-[11px] text-[#626977] sm:px-8">
        <span className="flex items-center gap-2">
          <LockKeyhole size={13} />
          <span>{record.isOwner ? "Your document" : "Shared document"}</span>
          <span aria-hidden="true" className="text-[#c3c7d0]">
            /
          </span>
          <span className="font-medium text-[#4c5261]">
            {record.canEdit ? "Editing" : "Viewing"}
          </span>
        </span>
        <span
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${liveConnected ? "border-[#dfe6ff] bg-[#eef2ff] text-[#315bee]" : "border-[#e6e8ef] bg-white text-[#626977]"}`}
        >
          {liveConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
          {liveConnected
            ? "Live collaboration connected"
            : "Live collaboration unavailable"}
        </span>
        <span
          role="status"
          aria-live="polite"
          className={`flex w-full items-center gap-1.5 lg:hidden ${saveStatus === "error" || saveStatus === "conflict" ? "text-amber-700" : "text-[#626977]"}`}
        >
          {saveStatus === "saving" ? (
            <Loader2 size={13} className="animate-spin" />
          ) : saveStatus === "saved" ? (
            <Check size={13} className="text-[#315bee]" />
          ) : (
            <CloudOff size={13} />
          )}
          {saveLabel}
        </span>
      </div>
      {connectionError && (
        <div
          role="status"
          className="mx-4 mb-4 flex max-w-4xl sm:mx-auto flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <p className="flex-1">{connectionError}</p>
          <button
            onClick={reconnect}
            className="min-h-11 rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold"
          >
            Reconnect
          </button>
        </div>
      )}
      {recoveryNotice && (
        <p
          role="status"
          className="mx-4 mb-4 max-w-4xl sm:mx-auto rounded-lg border border-[#dfe6ff] bg-[#eef2ff] px-4 py-3 text-sm text-[#315bee]"
        >
          {recoveryNotice}
        </p>
      )}
      {recoveryUnavailable && saveStatus !== "saved" && (
        <p
          role="alert"
          className="mx-4 mb-4 max-w-4xl sm:mx-auto rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          Browser recovery is unavailable. Keep this page open until your
          changes are saved, or download your draft.
        </p>
      )}
      {saveError && (
        <div
          role="alert"
          className="mx-4 mb-5 flex max-w-4xl sm:mx-auto flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <p className="flex-1">{saveError}</p>
          <button
            disabled={saveStatus === "saving"}
            onClick={
              saveStatus === "conflict" ? reloadLatest : () => void save()
            }
            className="flex items-center gap-2 min-h-11 rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold disabled:opacity-50"
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
