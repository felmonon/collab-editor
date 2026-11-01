"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, MoreHorizontal, Trash2 } from "lucide-react";

interface DocumentActionsProps {
  id: string;
  title: string;
  canDelete: boolean;
  onDelete: () => void;
}

export function DocumentActions({
  id,
  title,
  canDelete,
  onDelete,
}: DocumentActionsProps) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const firstAction = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    firstAction.current?.focus();

    const dismiss = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={container}
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-label={`Actions for ${title}`}
        aria-expanded={open}
        aria-controls={`document-actions-${id}`}
        onClick={() => setOpen((value) => !value)}
        className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#162333]"
      >
        <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
      </button>
      {open && (
        <div
          id={`document-actions-${id}`}
          className="absolute right-0 top-11 z-20 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg"
        >
          <Link
            ref={firstAction}
            href={`/documents/${id}`}
            className="focus-ring flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" /> Open
            document
          </Link>
          {canDelete && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                trigger.current?.focus();
                onDelete();
              }}
              className="focus-ring flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete document
            </button>
          )}
        </div>
      )}
    </div>
  );
}
