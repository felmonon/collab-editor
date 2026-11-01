"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, Trash2 } from "lucide-react";

interface DeleteDocumentDialogProps {
  document: { id: string; title: string };
  onClose: () => void;
  onDeleted: (id: string) => void;
}

export function DeleteDocumentDialog({
  document: selectedDocument,
  onClose,
  onDeleted,
}: DeleteDocumentDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  const deleteDocument = async () => {
    setDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/documents/${selectedDocument.id}`, {
        method: "DELETE",
      });
      if (!response.ok)
        throw new Error("We couldn’t delete this document. Please try again.");
      onDeleted(selectedDocument.id);
    } catch {
      setError("We couldn’t delete this document. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby="delete-document-title"
      aria-describedby="delete-document-description"
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
          Keep document
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
          {deleting ? "Deleting…" : "Delete document"}
        </button>
      </div>
    </dialog>
  );
}
