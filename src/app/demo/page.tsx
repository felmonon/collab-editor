"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  RotateCcw,
  Laptop,
} from "lucide-react";
import { BrandLogo } from "@/components/ui/brand";
import { TiptapEditor } from "@/components/editor/tiptap-editor";

const INITIAL = {
  title: "Good work starts with a clear idea.",
  content:
    "<p>A shared starting point makes the next step easier. Use this document to collect the idea, work through the details, and give the project a little direction.</p><h2>The starting point</h2><p>What are we trying to make better? Write a short description of the problem and the people it matters to. A few clear sentences are a good place to begin.</p><h2>A plan worth sharing</h2><ul><li><p><strong>Define the outcome.</strong> Describe what success would look like.</p></li><li><p><strong>Make room for questions.</strong> Capture what you still need to learn.</p></li><li><p><strong>Choose a next step.</strong> Start with something small and useful.</p></li></ul><blockquote><p>A first draft gives an idea somewhere to go.</p></blockquote><h2>Make this document yours</h2><p>Try a heading, format a sentence, or replace this sample with your own work. This demo saves in this browser only. Download a Markdown copy whenever you need it.</p>",
};
const STORAGE_KEY = "collab-editor-demo-v1";
const subscribeToClient = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
function readStoredDraft() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : null;
    return {
      draft:
        parsed &&
        typeof parsed.title === "string" &&
        typeof parsed.content === "string"
          ? (parsed as typeof INITIAL)
          : INITIAL,
      storageAvailable: true,
    };
  } catch {
    return { draft: INITIAL, storageAvailable: false };
  }
}
export default function DemoPage() {
  const ready = useSyncExternalStore(
    subscribeToClient,
    clientSnapshot,
    serverSnapshot,
  );
  return ready ? (
    <DemoWorkspace />
  ) : (
    <div className="min-h-screen bg-[#f6f7fb]" aria-label="Loading demo" />
  );
}
function DemoWorkspace() {
  const [initial] = useState(readStoredDraft);
  const [draft, setDraft] = useState(initial.draft);
  const [storageAvailable, setStorageAvailable] = useState(
    initial.storageAvailable,
  );
  const [resetOpen, setResetOpen] = useState(false);
  function updateDraft(next: typeof INITIAL) {
    setDraft(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setStorageAvailable(true);
    } catch {
      setStorageAvailable(false);
    }
  }
  useEffect(() => {
    function handleSave(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === "s")
        event.preventDefault();
    }
    window.addEventListener("keydown", handleSave);
    return () => window.removeEventListener("keydown", handleSave);
  }, []);
  return (
    <div className="min-h-screen bg-[#f6f7fb] text-[#171923]">
      <header className="sticky top-0 z-30 h-16 border-b border-[#e6e8ef] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-3 px-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <Link
              href="/"
              aria-label="Back to home"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#626977] transition-colors hover:bg-[#f6f7fb] hover:text-[#171923] focus-visible:outline-2 focus-visible:outline-[#315bee]"
            >
              <ArrowLeft size={18} />
            </Link>
            <Link href="/" aria-label="Collab home" className="hidden sm:block">
              <BrandLogo compact />
            </Link>
            <span
              aria-hidden="true"
              className="hidden h-6 w-px bg-[#e6e8ef] sm:block"
            />
            <span className="rounded-md border border-[#e0e6fb] bg-[#eef2ff] px-2.5 py-1 text-[11px] font-medium text-[#315bee]">
              <span className="sm:hidden">Demo</span>
              <span className="hidden sm:inline">Demo workspace</span>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-4">
            <span
              role="status"
              className="hidden items-center gap-1.5 text-[11px] text-[#626977] lg:flex"
            >
              <Check size={14} className="text-[#315bee]" />
              {storageAvailable
                ? "Saved in this browser"
                : "Browser storage unavailable"}
            </span>
            <button
              onClick={() => setResetOpen(!resetOpen)}
              aria-expanded={resetOpen}
              aria-label="Reset demo"
              title="Reset demo"
              className="flex h-11 w-11 items-center justify-center rounded-xl text-[#626977] transition-colors hover:bg-[#f6f7fb] hover:text-[#171923] focus-visible:outline-2 focus-visible:outline-[#315bee]"
            >
              <RotateCcw size={16} />
            </button>
            <Link
              href="/login?mode=signup"
              className="flex min-h-11 items-center gap-2 rounded-xl bg-[#315bee] px-3 text-xs font-semibold text-white shadow-[0_2px_6px_#315bee25] transition-colors hover:bg-[#244bd5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315bee] sm:px-4"
            >
              <span className="sm:hidden">Sign up</span>
              <span className="hidden sm:inline">Create a workspace</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </header>
      {resetOpen && (
        <div className="flex flex-wrap items-center justify-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p>Replace your demo draft with the sample document?</p>
          <button
            className="min-h-11 rounded-lg border border-amber-300 px-3 font-semibold"
            onClick={() => {
              updateDraft(INITIAL);
              setResetOpen(false);
            }}
          >
            Reset draft
          </button>
          <button
            className="min-h-11 rounded-lg px-3 font-medium underline underline-offset-4"
            onClick={() => setResetOpen(false)}
          >
            Keep writing
          </button>
        </div>
      )}
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4 text-[11px] text-[#626977] sm:px-8">
        <span className="flex items-center gap-2">
          <Laptop size={13} />
          <span>Local demo</span>
          <span aria-hidden="true" className="text-[#c3c7d0]">
            /
          </span>
          <span className="font-medium text-[#4c5261]">Try the editor</span>
        </span>
        <span className="rounded-full border border-[#e6e8ef] bg-white px-2.5 py-1">
          Local only · no cloud sync
        </span>
        <span
          role="status"
          className="flex w-full items-center gap-1.5 lg:hidden"
        >
          <Check size={13} className="text-[#315bee]" />
          {storageAvailable
            ? "Saved in this browser"
            : "Browser storage unavailable"}
        </span>
      </div>
      {!storageAvailable && (
        <p
          role="alert"
          className="mx-auto max-w-3xl px-6 pb-4 text-sm text-amber-700"
        >
          Your browser couldn’t save this draft. Use Download Markdown to keep a
          copy before leaving.
        </p>
      )}
      <TiptapEditor
        title={draft.title}
        content={draft.content}
        onTitleChange={(title) => updateDraft({ ...draft, title })}
        onUpdate={(content) => updateDraft({ ...draft, content })}
      />
    </div>
  );
}
