"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

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
      className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-[#162333] shadow-xl backdrop:bg-slate-950/35"
    >
      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-700">
        <Trash2 className="h-5 w-5" aria-hidden="true" />
      </div>
      <h2 id="delete-document-title" className="text-xl font-semibold">
        Delete this document?
      </h2>
      <p
        id="delete-document-description"
        className="mt-3 break-words text-sm leading-6 text-slate-600"
      >
        <span className="font-medium text-slate-800">
          {selectedDocument.title}
        </span>{" "}
        will be permanently deleted, including its version history. This can’t
        be undone.
      </p>
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      <div className="mt-7 flex justify-end gap-3">
        <button
          autoFocus
          type="button"
          disabled={deleting}
          onClick={onClose}
          className="focus-ring rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
        >
          Keep document
        </button>
        <button
          type="button"
          disabled={deleting}
          onClick={deleteDocument}
          className="focus-ring inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60"
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
