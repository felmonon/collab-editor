"use client";

import Link from "next/link";
import { signOutSafely } from "@/lib/auth-session-client";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown, Loader2, LogOut, Settings2 } from "lucide-react";

export function AccountMenu({
  name,
  email,
}: {
  name: string;
  email?: string | null;
}) {
  const id = useId();
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const initialFocus = useRef<"first" | "last">("first");
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const initials =
    name.trim().split(/\s+/).slice(0, 2)
      .map((part) => part.charAt(0)).join("").toUpperCase() || "Y";

  useEffect(() => {
    if (!open) return;
    const items = menu.current?.querySelectorAll<HTMLElement>(
      '[role="menuitem"]',
    );
    items?.[initialFocus.current === "last" ? items.length - 1 : 0]?.focus();

    const dismiss = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const dismissWithEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    };
    const dismissOnFocusOutside = (event: FocusEvent) => {
      if (
        event.target !== document.body &&
        !container.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", dismissWithEscape);
    document.addEventListener("focusin", dismissOnFocusOutside);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", dismissWithEscape);
      document.removeEventListener("focusin", dismissOnFocusOutside);
    };
  }, [open]);

  function closeAndFocusTrigger() {
    setOpen(false);
    trigger.current?.focus();
  }

  function handleMenuKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeAndFocusTrigger();
      return;
    }
    if (event.key === "Tab") {
      // Restore the starting point before the browser moves to the next or
      // previous tab stop. Menu items are reached with arrow keys instead.
      closeAndFocusTrigger();
      return;
    }
    const items = Array.from(
      menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') || [],
    );
    const current = items.indexOf(document.activeElement as HTMLElement);
    let next: number | undefined;
    if (event.key === "ArrowDown") next = (current + 1) % items.length;
    if (event.key === "ArrowUp")
      next = (current - 1 + items.length) % items.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = items.length - 1;
    if (
      !event.altKey && !event.ctrlKey && !event.metaKey &&
      /^[as]$/i.test(event.key)
    )
      next = event.key.toLowerCase() === "a" ? 0 : 1;
    if (next !== undefined) {
      event.preventDefault();
      items[next]?.focus();
    }
  }

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    setError("");
    try {
      await signOutSafely();
    } catch {
      setSigningOut(false);
      setError(
        "You couldn’t be signed out. Check your connection and try again.",
      );
    }
  }

  return (
    <div
      ref={container}
      className="relative shrink-0"
      onBlur={(event) => {
        // Selecting the static identity text can blur to body without a new
        // focus target. Outside clicks and Tab dismiss through their handlers.
        if (
          event.relatedTarget &&
          !event.currentTarget.contains(event.relatedTarget as Node)
        )
          setOpen(false);
      }}
    >
      <button
        ref={trigger}
        id={`${id}-trigger`}
        type="button"
        aria-label={`Account menu for ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${id}-menu` : undefined}
        onClick={() => {
          initialFocus.current = "first";
          setOpen((value) => !value);
        }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
          event.preventDefault();
          initialFocus.current = event.key === "ArrowUp" ? "last" : "first";
          setOpen(true);
        }}
        className={`focus-ring flex min-h-11 items-center gap-1.5 rounded-xl p-1.5 transition-colors ${open ? "bg-[#edf1ff]" : "hover:bg-[#f3f5fb]"}`}
      >
        <span
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-[#edf0fa] text-[12px] font-semibold text-[#6977a2]"
        >
          {initials}
        </span>
        <ChevronDown
          size={12}
          aria-hidden="true"
          className={`text-[#747985] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-[280px] max-w-[calc(100vw-32px)] overflow-hidden rounded-xl border border-[#e6e8ef] bg-white shadow-[0_16px_48px_-12px_#17192330]">
          <div className="border-b border-[#eceef4] px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#747985]">
              Signed in as
            </p>
            <p className="mt-2 break-words text-[13px] font-semibold text-[#252a38]">
              {name}
            </p>
            {email && (
              <p className="mt-1 break-all text-[12px] leading-5 text-[#626977]">
                {email}
              </p>
            )}
          </div>
          <div
            ref={menu}
            id={`${id}-menu`}
            role="menu"
            aria-labelledby={`${id}-trigger`}
            onKeyDown={handleMenuKey}
            className="p-1.5"
          >
            <Link
              href="/account"
              role="menuitem"
              tabIndex={-1}
              onClick={closeAndFocusTrigger}
              onKeyDown={(event) => {
                if (event.key === " ") {
                  event.preventDefault();
                  event.currentTarget.click();
                }
              }}
              className="focus-ring flex min-h-11 items-center gap-3 rounded-lg px-3 text-[13px] text-[#353b49] transition-colors hover:bg-[#f3f5fb] focus:bg-[#f3f5fb]"
            >
              <Settings2
                size={16}
                aria-hidden="true"
                className="text-[#747985]"
              />
              Account settings
            </Link>
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              aria-disabled={signingOut || undefined}
              onClick={handleSignOut}
              className="focus-ring flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-[13px] text-[#353b49] transition-colors hover:bg-[#f3f5fb] focus:bg-[#f3f5fb] aria-disabled:cursor-wait aria-disabled:text-[#747985]"
            >
              {signingOut ? (
                <Loader2 size={16} aria-hidden="true" className="animate-spin" />
              ) : (
                <LogOut size={16} aria-hidden="true" className="text-[#747985]" />
              )}
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
          {error && (
            <p
              role="alert"
              className="border-t border-[#eceef4] px-4 py-3 text-[12px] leading-5 text-[#b33c4b]"
            >
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
