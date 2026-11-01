"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, Trash2 } from "lucide-react";
import { deleteDocumentWithReconciliation } from "@/lib/documents/delete-document";
import { SESSION_RECOVERY_ERROR } from "@/lib/auth-session-client";

interface DeleteDocumentDialogProps {
  document: { id: string; title: string };
  onClose: () => void;
  onDeleted: (id: string, confirmedDeletion: boolean) => void;
  onSessionExpired: () => Promise<void>;
}

export function DeleteDocumentDialog({
  document: selectedDocument,
  onClose,
  onDeleted,
  onSessionExpired,
}: DeleteDocumentDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [deleting, setDeleting] = useState(false);
  const [checking, setChecking] = useState(false);
  const active = useRef(false);
  const request = useRef<AbortController | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    active.current = true;
    const element = dialog.current;
    element?.showModal();
    return () => {
      active.current = false;
      request.current?.abort();
      element?.close();
    };
  }, []);

  const deleteDocument = async () => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setDeleting(true);
    setChecking(false);
    setError("");
    try {
      const result = await deleteDocumentWithReconciliation(selectedDocument.id, {
        signal: controller.signal,
        onChecking: () => { if (active.current) setChecking(true); },
      });
      if (!active.current || controller.signal.aborted) return;
      if (result.status === "unauthorized") {
        await onSessionExpired();
      } else if (result.status === "error") {
        setError(result.message);
      } else {
        onDeleted(selectedDocument.id, result.status === "deleted");
      }
    } catch (error) {
      if (active.current && !controller.signal.aborted)
        setError(error instanceof Error && error.message === SESSION_RECOVERY_ERROR
          ? SESSION_RECOVERY_ERROR
          : "We couldn’t confirm whether the document was deleted. Close this dialog and refresh your workspace before trying again.");
    } finally {
      if (request.current === controller) request.current = null;
      if (active.current) {
        setDeleting(false);
        setChecking(false);
      }
    }
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby="delete-document-title"
      aria-describedby="delete-document-description"
      aria-busy={deleting || undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (!deleting) onClose();
      }}
      className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl border border-[#e6e8ef] bg-white p-7 text-[#171923] shadow-[0_24px_80px_-24px_#17192344] backdrop:bg-[#171923]/40"
    >
      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff1f2] text-[#c55e68]">
        <Trash2 className="h-5 w-5" aria-hidden="true" />
      </div>
      <h2
        id="delete-document-title"
        className="text-[20px] font-semibold tracking-[-0.03em]"
      >
        Delete this document?
      </h2>
      <p
        id="delete-document-description"
        className="mt-3 text-[13px] leading-6 text-[#6f7481]"
      >
        This document and its version history will be permanently deleted.
        Everyone with access will lose it. This can’t be undone.
      </p>
      <div className="mt-5 flex items-center gap-3 rounded-lg border border-[#e8ebf2] bg-[#f8f9fc] px-3 py-3">
        <FileText
          size={17}
          className="shrink-0 text-[#8f9dc6]"
          aria-hidden="true"
        />
        <span className="min-w-0 break-words text-[12px] font-medium text-[#61697b]">
          {selectedDocument.title}
        </span>
      </div>
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      <div className="mt-7 flex flex-wrap justify-end gap-2.5">
        <button
          autoFocus
          type="button"
          disabled={deleting}
          onClick={onClose}
          className="focus-ring rounded-lg border border-[#e1e5ef] px-4 py-2.5 text-[12px] font-medium text-[#6a7284] hover:bg-[#f5f6fb] disabled:opacity-50"
        >
          {error ? "Close" : "Keep document"}
        </button>
        <button
          type="button"
          disabled={deleting}
          onClick={deleteDocument}
          className="focus-ring inline-flex items-center gap-2 rounded-lg bg-[#bf4f5a] px-4 py-2.5 text-[12px] font-medium text-white hover:bg-[#a9424d] disabled:opacity-60"
        >
          {deleting && (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          {checking ? "Checking status…" : deleting ? "Deleting…" : error ? "Try delete again" : "Delete document"}
        </button>
      </div>
    </dialog>
  );
}
