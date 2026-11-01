"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Loader2, LockKeyhole, UserPlus, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";

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
  const [shares, setShares] = useState<Share[]>([]);
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState("EDIT");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { addToast } = useToast();
  const load = useCallback(() => {
    return fetch(`/api/documents/${documentId}/shares`)
      .then(async (res) => {
        if (!res.ok)
          throw new Error(
            "Couldn’t load collaborators. Close this window and try again.",
          );
        return res.json();
      })
      .then((data) => setShares(data.shares))
      .catch((error) =>
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load sharing settings.",
        ),
      )
      .finally(() => setLoading(false));
  }, [documentId]);
  useEffect(() => {
    dialogRef.current?.showModal();
    void load();
  }, [load]);
  async function changeAccess(method: "POST" | "DELETE", targetEmail: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/documents/${documentId}/shares`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, permission }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn’t update access.");
      setEmail("");
      await load();
      addToast(
        method === "POST"
          ? "Access updated. Send your collaborator the document link."
          : "Access removed.",
        "success",
      );
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Couldn’t update access.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border bg-white p-0 text-[#162333] shadow-xl backdrop:bg-slate-950/30"
      aria-labelledby="share-title"
    >
      <div className="p-6 sm:p-8">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 id="share-title" className="text-xl font-semibold">
              Better with a second perspective.
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Invite someone to this document.
            </p>
          </div>
          <button
            aria-label="Close sharing"
            onClick={onClose}
            className="-mr-2 -mt-2 rounded p-2 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void changeAccess("POST", email);
          }}
        >
          <label
            htmlFor="share-email"
            className="mb-2 block text-xs font-medium"
          >
            Collaborator’s email
          </label>
          <div className="flex gap-2">
            <input
              id="share-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              className="min-w-0 flex-1 rounded-lg border px-3 py-2.5 text-sm"
            />
            <select
              aria-label="Access level"
              value={permission}
              onChange={(event) => setPermission(event.target.value)}
              className="rounded-lg border px-2 text-sm"
            >
              <option value="EDIT">Can edit</option>
              <option value="VIEW">Can view</option>
            </select>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            They’ll need a Collab Editor account with this email. No email
            invitation is sent.
          </p>
          <button
            disabled={busy || loading}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#167d72] py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <UserPlus size={16} />
            )}{" "}
            Add collaborator
          </button>
        </form>
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        <div className="mt-6 border-t pt-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            People with access
          </p>
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : shares.length === 0 ? (
            <p className="text-sm text-slate-500">
              Only you have access so far.
            </p>
          ) : (
            <ul className="max-h-52 space-y-4 overflow-auto">
              {shares.map((share) => (
                <li
                  key={share.id}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {share.user.name || share.user.email}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {share.user.email} ·{" "}
                      {share.permission === "VIEW" ? "Can view" : "Can edit"}
                    </p>
                  </div>
                  <button
                    disabled={busy}
                    onClick={() =>
                      void changeAccess("DELETE", share.user.email)
                    }
                    className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-6 flex items-center justify-between gap-3 border-t pt-5">
          <span className="flex items-center gap-2 text-xs text-slate-500">
            <LockKeyhole size={14} /> Restricted to people with access
          </span>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(window.location.href);
                addToast("Document link copied.", "success");
              } catch {
                setError(
                  "Couldn’t copy the link. Copy the address from your browser instead.",
                );
              }
            }}
            className="flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-slate-50"
          >
            <Copy size={14} /> Copy link
          </button>
        </div>
      </div>
    </dialog>
  );
}
