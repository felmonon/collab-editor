"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Feather,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { TiptapEditor } from "@/components/editor/tiptap-editor";

const INITIAL = {
  title: "Good ideas start here.",
  content:
    "<p>Every great project begins with a little space to think. This is yours. A quiet place to capture the first thought, find the right words, and turn an idea into something worth sharing.</p><h2>A little room to explore</h2><p>This is a real editor. Select a sentence, make it <strong>bold</strong>, or try a heading. Your changes stay in this browser, so you can pick up where you left off.</p><blockquote><p>The best work rarely starts with a perfect first draft. It starts with a first line.</p></blockquote><h2>Make yourself at home</h2><ul><li><p>Give this document a title of your own.</p></li><li><p>Try focus mode for a distraction-free view.</p></li><li><p>Download your work as a Markdown file.</p></li></ul><h2>Better, together</h2><p>Ready to bring someone into the process? Create an account to save documents to your workspace and share them with other registered collaborators.</p><p>Until then, take your time. There’s no wrong way to begin.</p>",
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
    <div className="min-h-screen bg-[#f5f6f7]" aria-label="Loading demo" />
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
    <div className="min-h-screen bg-[#f5f6f7]">
      <header className="sticky top-0 z-30 h-[73px] border-b bg-white">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href="/"
              aria-label="Back to home"
              className="rounded-md p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-900"
            >
              <ArrowLeft size={18} />
            </Link>
            <Link
              href="/"
              className="hidden items-center gap-2 font-semibold tracking-tight text-[#162333] sm:flex"
            >
              <Feather className="text-teal-700" size={22} /> collab
              <span className="text-teal-700">.</span>
            </Link>
            <span className="hidden h-5 w-px bg-slate-200 sm:block" />
            <span className="rounded border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-medium text-teal-800">
              Demo workspace
            </span>
          </div>
          <div className="flex items-center gap-5">
            <span
              role="status"
              className="hidden items-center gap-1.5 text-xs text-slate-500 lg:flex"
            >
              <Check size={14} className="text-teal-700" />
              {storageAvailable
                ? "Saved in this browser"
                : "Browser storage unavailable"}
            </span>
            <button
              onClick={() => setResetOpen(!resetOpen)}
              aria-expanded={resetOpen}
              aria-label="Reset demo"
              title="Reset demo"
              className="rounded-md p-2 text-slate-400 hover:bg-slate-50"
            >
              <RotateCcw size={16} />
            </button>
            <Link
              href="/login?mode=signup"
              className="flex items-center gap-2 rounded-lg bg-[#167d72] px-3 py-2.5 text-xs font-medium text-white hover:bg-[#12695f] sm:px-4"
            >
              Create a workspace <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </header>
      {resetOpen && (
        <div className="flex flex-wrap items-center justify-center gap-4 border-b border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p>Replace your demo draft with the sample document?</p>
          <button
            className="font-semibold underline"
            onClick={() => {
              updateDraft(INITIAL);
              setResetOpen(false);
            }}
          >
            Reset draft
          </button>
          <button className="underline" onClick={() => setResetOpen(false)}>
            Keep writing
          </button>
        </div>
      )}
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-2 px-6 py-5 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Workspace</span>
          <span>/</span>
          <span>Getting started</span>
        </div>
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={14} /> Local demo · only visible in this browser
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
      {
        <TiptapEditor
          title={draft.title}
          content={draft.content}
          onTitleChange={(title) => updateDraft({ ...draft, title })}
          onUpdate={(content) => updateDraft({ ...draft, content })}
        />
      }
    </div>
  );
}
