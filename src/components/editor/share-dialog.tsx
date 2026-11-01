"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Copy,
  Loader2,
  LockKeyhole,
  RefreshCw,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { recoverExpiredSession } from "@/lib/auth-session-client";

interface Share {
  id: string;
  permission: string;
  user: { name: string | null; email: string };
}
export function ShareDialog({
  documentId,
  onClose,
}: {
  documentId: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const requestController = useRef<AbortController | null>(null);
  const [shares, setShares] = useState<Share[] | null>(null);
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState("EDIT");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const { addToast } = useToast();
  const load = useCallback(() => {
    const controller = requestController.current;
    if (!controller || controller.signal.aborted) return Promise.resolve();
    const active = () =>
      requestController.current === controller && !controller.signal.aborted;
    return fetch(`/api/documents/${documentId}/shares`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!active()) return null;
        if (res.status === 401) {
          await recoverExpiredSession(`/documents/${documentId}`);
          return null;
        }
        if (!res.ok)
          throw new Error(
            "We couldn’t refresh the access list. Existing access hasn’t been verified.",
          );
        return res.json();
      })
      .then((data) => {
        if (!active() || data === null) return;
        if (!Array.isArray(data.shares))
          throw new Error("Unable to read the access list.");
        setShares(data.shares);
        setLoadError("");
      })
      .catch((error) => {
        if (!active()) return;
        setShares(null);
        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load sharing settings.",
        );
      })
      .finally(() => {
        if (active()) setLoading(false);
      });
  }, [documentId]);
  useEffect(() => {
    const controller = new AbortController();
    requestController.current = controller;
    const dialog = dialogRef.current;
    dialog?.showModal();
    void load();
    return () => {
      controller.abort();
      if (requestController.current === controller)
        requestController.current = null;
      dialog?.close();
    };
  }, [load]);
  async function changeAccess(method: "POST" | "DELETE", targetEmail: string) {
    const controller = requestController.current;
    if (busy || loading || !controller || controller.signal.aborted) return;
    const active = () =>
      requestController.current === controller && !controller.signal.aborted;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/documents/${documentId}/shares`, {
        method,
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, permission }),
      });
      if (!active()) return;
      if (res.status === 401) {
        await recoverExpiredSession(`/documents/${documentId}`);
        return;
      }
      const data = await res.json();
      if (!active()) return;
      if (!res.ok) throw new Error(data.error || "Couldn’t update access.");
      setEmail("");
      setLoading(true);
      await load();
      if (!active()) return;
      addToast(
        method === "POST"
          ? "Access updated. Send your collaborator the document link."
          : "Access removed.",
        "success",
      );
    } catch (error) {
      if (!active()) return;
      setError(
        error instanceof Error ? error.message : "Couldn’t update access.",
      );
    } finally {
      if (active()) setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-[520px] overflow-y-auto rounded-2xl border border-[#e6e8ef] bg-white p-0 text-[#171923] shadow-[0_24px_100px_-20px_#17192360] backdrop:bg-[#171923]/40 backdrop:backdrop-blur-sm"
      aria-labelledby="share-title"
      aria-describedby="share-description"
    >
      <div className="border-b border-[#e6e8ef] px-6 py-6 sm:px-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef2ff] text-[#315bee]">
              <Users size={19} />
            </div>
            <h2
              id="share-title"
              className="text-[23px] font-semibold tracking-[-0.035em]"
            >
              Share document
            </h2>
            <p
              id="share-description"
              className="mt-1.5 text-sm leading-6 text-[#626977]"
            >
              Choose who can read or edit this document.
            </p>
          </div>
          <button
            aria-label="Close sharing"
            onClick={onClose}
            className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#626977] hover:bg-[#f6f7fb] hover:text-[#171923] focus-visible:outline-2 focus-visible:outline-[#315bee]"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="px-6 py-6 sm:px-8">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void changeAccess("POST", email);
          }}
        >
          <label
            htmlFor="share-email"
            className="mb-2.5 block text-xs font-semibold text-[#353b49]"
          >
            Add a collaborator
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id="share-email"
              type="email"
              required
              disabled={busy || loading}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              className="h-12 min-w-0 basis-full rounded-xl border border-[#e0e3ec] bg-[#fafbfe] px-3.5 text-sm outline-none placeholder:text-[#a0a5b1] focus:border-[#315bee] focus:ring-2 focus:ring-[#315bee]/10 disabled:opacity-50 sm:flex-1 sm:basis-auto"
            />
            <select
              aria-label="Access level"
              disabled={busy || loading}
              value={permission}
              onChange={(event) => setPermission(event.target.value)}
              className="h-12 rounded-xl border border-[#e0e3ec] bg-white px-3 text-xs font-medium outline-none focus:border-[#315bee] focus:ring-2 focus:ring-[#315bee]/10 disabled:opacity-50"
            >
              <option value="EDIT">Can edit</option>
              <option value="VIEW">Can view</option>
            </select>
          </div>
          <p className="mt-2.5 text-xs leading-5 text-[#626977]">
            {permission === "EDIT"
              ? "Can write and rename this document. Only you manage access."
              : "Can read this document and download a copy."}
          </p>
          <button
            disabled={busy || loading}
            className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#315bee] px-4 py-3 text-xs font-semibold text-white transition-colors hover:bg-[#244bd5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315bee] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="animate-spin" size={15} />
            ) : (
              <UserPlus size={15} />
            )}{" "}
            Add collaborator
          </button>
          <p className="mt-3 text-[11px] leading-5 text-[#626977]">
            They need a Collab Editor account with this email. No invitation
            email is sent; share the document link after adding them.
          </p>
        </form>
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-xs leading-5 text-red-700"
          >
            {error}
          </p>
        )}
        <div className="mt-6 border-t border-[#e6e8ef] pt-5">
          <p className="mb-4 flex items-center justify-between text-xs font-semibold text-[#353b49]">
            People with access
            <span className="text-[10px] font-normal text-[#626977]">
              Managed by you
            </span>
          </p>
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#191b23] text-white">
              <LockKeyhole size={14} />
            </span>
            <div className="flex-1">
              <p className="text-xs font-medium">You</p>
              <p className="mt-0.5 text-[11px] text-[#626977]">
                Document owner
              </p>
            </div>
            <span className="rounded-md bg-[#f6f7fb] px-2 py-1 text-[10px] font-medium text-[#626977]">
              Owner
            </span>
          </div>
          {loading ? (
            <p
              role="status"
              className="flex items-center gap-2 py-2 text-xs text-[#626977]"
            >
              <Loader2 size={14} className="animate-spin" /> Refreshing access…
            </p>
          ) : loadError ? (
            <div
              role="alert"
              className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"
            >
              <p>{loadError}</p>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setLoading(true);
                  void load();
                }}
                className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-amber-300 px-3 text-xs font-semibold disabled:opacity-50"
              >
                <RefreshCw size={13} /> Retry access list
              </button>
            </div>
          ) : shares?.length === 0 ? (
            <p className="rounded-xl bg-[#f6f7fb] px-4 py-3 text-xs leading-5 text-[#626977]">
              No collaborators yet. Add someone above to work together.
            </p>
          ) : (
            <ul className="max-h-52 space-y-3 overflow-auto">
              {shares?.map((share) => (
                <li key={share.id} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eef2ff] text-xs font-semibold text-[#315bee]">
                    {(share.user.name || share.user.email)
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">
                      {share.user.name || share.user.email}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-[#626977]">
                      {share.user.email}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#626977]">
                      {share.permission === "VIEW" ? "Can view" : "Can edit"}
                    </p>
                  </div>
                  <button
                    disabled={busy}
                    onClick={() =>
                      void changeAccess("DELETE", share.user.email)
                    }
                    className="min-h-11 shrink-0 rounded-lg px-2 text-[11px] font-medium text-[#626977] transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-[#315bee] disabled:opacity-50"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e6e8ef] bg-[#fafbfe] px-6 py-4 sm:px-8">
        <span className="flex items-center gap-2 text-[11px] text-[#626977]">
          <LockKeyhole size={13} /> Only people with access can open
        </span>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(window.location.href);
              setError("");
              addToast("Document link copied.", "success");
            } catch {
              setError(
                "Couldn’t copy the link. Copy the address from your browser instead.",
              );
            }
          }}
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-[#e0e3ec] bg-white px-3 text-xs font-medium text-[#353b49] transition-colors hover:border-[#315bee] hover:text-[#315bee] focus-visible:outline-2 focus-visible:outline-[#315bee]"
        >
          <Copy size={14} /> Copy link
        </button>
      </div>
    </dialog>
  );
}
