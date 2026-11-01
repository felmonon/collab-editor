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
        className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg text-[#747c8c] transition-colors hover:bg-[#edf1ff] hover:text-[#315bee]"
      >
        <MoreHorizontal className="h-[18px] w-[18px]" aria-hidden="true" />
      </button>
      {open && (
        <div
          id={`document-actions-${id}`}
          className="absolute right-0 top-10 z-20 w-44 rounded-xl border border-[#e6e8ef] bg-white p-1.5 shadow-[0_10px_30px_-8px_#17192326]"
        >
          <Link
            ref={firstAction}
            href={`/documents/${id}`}
            className="focus-ring flex items-center gap-2 rounded-lg px-3 py-2.5 text-[12px] text-[#697184] hover:bg-[#f3f5fb]"
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
              className="focus-ring flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[12px] text-[#bf555f] hover:bg-[#fff1f2]"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete document
            </button>
          )}
        </div>
      )}
    </div>
  );
}
