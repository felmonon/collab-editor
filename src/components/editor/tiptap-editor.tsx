"use client";

import {
  useEditor,
  useEditorState,
  EditorContent,
  type Editor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { type ReactNode, useEffect, useState } from "react";
import {
  Bold,
  Italic,
  Strikethrough,
  Code2,
  List,
  ListOrdered,
  Quote,
  Undo2,
  Redo2,
  Underline,
  Download,
  PanelRight,
  Maximize2,
  Minimize2,
  Minus,
} from "lucide-react";
import { downloadDocument, toMarkdown } from "@/lib/editor-document";

interface TiptapEditorProps {
  content: string;
  onUpdate: (content: string) => void;
  editable?: boolean;
  title?: string;
  onTitleChange?: (title: string) => void;
}

function MenuButton({
  onClick,
  active = false,
  disabled = false,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors disabled:opacity-30 ${active ? "bg-teal-100 text-teal-800" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}
    >
      {children}
    </button>
  );
}

export function TiptapEditor({
  content,
  onUpdate,
  editable = true,
  title = "Untitled",
  onTitleChange,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ link: { openOnClick: false } })],
    content: content || "<p></p>",
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose editor-prose max-w-none focus:outline-none",
        role: "textbox",
        "aria-label": "Document content",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor }) => onUpdate(editor.getHTML()),
  });
  if (!editor)
    return (
      <div
        className="mx-auto min-h-[600px] max-w-[820px] animate-pulse rounded-lg border bg-white"
        aria-label="Loading editor"
      />
    );
  return (
    <EditorSurface
      editor={editor}
      content={content}
      editable={editable}
      title={title}
      onTitleChange={onTitleChange}
    />
  );
}

function EditorSurface({
  editor,
  content,
  editable = true,
  title = "Untitled",
  onTitleChange,
}: Omit<TiptapEditorProps, "onUpdate"> & { editor: Editor }) {
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor) return null;
      const text = editor.getText();
      const headings: { text: string; level: number; position: number }[] = [];
      editor.state.doc.descendants((node, position) => {
        if (node.type.name === "heading")
          headings.push({
            text: node.textContent,
            level: node.attrs.level,
            position,
          });
      });
      return {
        bold: editor.isActive("bold"),
        italic: editor.isActive("italic"),
        underline: editor.isActive("underline"),
        strike: editor.isActive("strike"),
        code: editor.isActive("codeBlock"),
        bullet: editor.isActive("bulletList"),
        ordered: editor.isActive("orderedList"),
        quote: editor.isActive("blockquote"),
        heading:
          [1, 2, 3].find((level) => editor.isActive("heading", { level })) ?? 0,
        undo: editor.can().undo(),
        redo: editor.can().redo(),
        words: text.trim() ? text.trim().split(/\s+/u).length : 0,
        characters: text.length,
        headings,
      };
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML())
      editor.commands.setContent(content || "<p></p>", { emitUpdate: false });
  }, [content, editor]);
  useEffect(() => {
    editor?.setEditable(editable, false);
  }, [editable, editor]);
  useEffect(() => {
    if (!focusMode) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFocusMode(false);
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [focusMode]);

  if (!editor || !state)
    return (
      <div
        className="mx-auto min-h-[600px] max-w-[820px] animate-pulse rounded-lg border bg-white"
        aria-label="Loading editor"
      />
    );

  return (
    <section
      className={
        focusMode ? "fixed inset-0 z-50 overflow-y-auto bg-[#f5f6f7]" : ""
      }
      aria-label="Writing workspace"
    >
      <div
        className={`editor-toolbar sticky ${focusMode ? "top-0" : "top-[73px]"} z-20 border-y bg-white/95 backdrop-blur-sm`}
      >
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-1 px-3 py-2 sm:px-6">
          {editable && (
            <>
              <MenuButton
                label="Undo (⌘/Ctrl Z)"
                disabled={!state.undo}
                onClick={() => editor.chain().focus().undo().run()}
              >
                <Undo2 size={16} />
              </MenuButton>
              <MenuButton
                label="Redo (⌘/Ctrl Shift Z)"
                disabled={!state.redo}
                onClick={() => editor.chain().focus().redo().run()}
              >
                <Redo2 size={16} />
              </MenuButton>
              <span className="mx-2 h-5 w-px bg-slate-200" />
              <select
                aria-label="Text style"
                value={state.heading}
                className="h-9 w-28 rounded-md bg-transparent px-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                onChange={(event) => {
                  const level = Number(event.target.value) as 0 | 1 | 2 | 3;
                  if (level === 0) editor.chain().focus().setParagraph().run();
                  else editor.chain().focus().toggleHeading({ level }).run();
                }}
              >
                <option value={0}>Normal text</option>
                <option value={1}>Heading 1</option>
                <option value={2}>Heading 2</option>
                <option value={3}>Heading 3</option>
              </select>
              <span className="mx-2 h-5 w-px bg-slate-200" />
              <MenuButton
                label="Bold (⌘/Ctrl B)"
                active={state.bold}
                onClick={() => editor.chain().focus().toggleBold().run()}
              >
                <Bold size={16} />
              </MenuButton>
              <MenuButton
                label="Italic (⌘/Ctrl I)"
                active={state.italic}
                onClick={() => editor.chain().focus().toggleItalic().run()}
              >
                <Italic size={16} />
              </MenuButton>
              <MenuButton
                label="Underline (⌘/Ctrl U)"
                active={state.underline}
                onClick={() => editor.chain().focus().toggleUnderline().run()}
              >
                <Underline size={16} />
              </MenuButton>
              <MenuButton
                label="Strikethrough"
                active={state.strike}
                onClick={() => editor.chain().focus().toggleStrike().run()}
              >
                <Strikethrough size={16} />
              </MenuButton>
              <span className="mx-2 h-5 w-px bg-slate-200" />
              <MenuButton
                label="Bullet list"
                active={state.bullet}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
              >
                <List size={17} />
              </MenuButton>
              <MenuButton
                label="Numbered list"
                active={state.ordered}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
              >
                <ListOrdered size={17} />
              </MenuButton>
              <MenuButton
                label="Blockquote"
                active={state.quote}
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
              >
                <Quote size={16} />
              </MenuButton>
              <MenuButton
                label="Code block"
                active={state.code}
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              >
                <Code2 size={17} />
              </MenuButton>
              <MenuButton
                label="Horizontal divider"
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
              >
                <Minus size={17} />
              </MenuButton>
            </>
          )}
          {!editable && (
            <span className="px-2 text-xs text-slate-500">
              You have view-only access
            </span>
          )}
          <div className="ml-auto flex items-center gap-1">
            <MenuButton
              label="Download Markdown"
              onClick={() =>
                downloadDocument(
                  title || "Untitled",
                  `# ${(title || "Untitled").replace(/\n/g, " ")}\n\n${toMarkdown(editor.getJSON())}`,
                )
              }
            >
              <Download size={16} />
            </MenuButton>
            <MenuButton
              label={focusMode ? "Exit focus mode" : "Focus mode"}
              active={focusMode}
              onClick={() => setFocusMode(!focusMode)}
            >
              {focusMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </MenuButton>
            <MenuButton
              label="Toggle document outline"
              active={outlineOpen}
              onClick={() => setOutlineOpen(!outlineOpen)}
            >
              <PanelRight size={16} />
            </MenuButton>
          </div>
        </div>
      </div>
      <div
        className={`mx-auto flex max-w-[1200px] items-start justify-center gap-8 px-3 py-6 sm:px-6 sm:py-10 ${focusMode ? "min-h-screen" : ""}`}
      >
        <div className="min-w-0 flex-1 max-w-[820px]">
          <div className="editor-paper overflow-hidden border border-[#e4e7e8] bg-white shadow-[0_4px_24px_-16px_#16233330] sm:rounded-sm">
            <div className="px-6 pt-10 sm:px-16 sm:pt-14">
              <div className="mb-6 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[.17em] text-teal-700">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />{" "}
                {editable ? "A space for your ideas" : "Shared document"}
              </div>
              <input
                aria-label="Document title"
                value={title}
                maxLength={200}
                readOnly={!editable || !onTitleChange}
                onChange={(event) => onTitleChange?.(event.target.value)}
                placeholder="Untitled document"
                className="w-full border-0 bg-transparent pb-5 font-[Georgia,serif] text-3xl leading-tight tracking-tight text-[#162333] outline-none sm:text-[38px]"
              />
              <div className="h-px bg-slate-100" />
            </div>
            <EditorContent editor={editor} />
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-2 px-1 py-4 text-[11px] text-slate-500">
            <div className="flex gap-4">
              <span>{state.words.toLocaleString()} words</span>
              <span>{state.characters.toLocaleString()} characters</span>
              <span>{Math.max(1, Math.ceil(state.words / 200))} min read</span>
            </div>
            <span>
              {focusMode
                ? "Press Esc to leave focus mode"
                : "Made for a little more focus."}
            </span>
          </footer>
        </div>
        {outlineOpen && !focusMode && (
          <aside
            className="sticky top-40 hidden w-48 shrink-0 pt-4 xl:block"
            aria-label="Document outline"
          >
            <p className="mb-5 text-[10px] font-semibold uppercase tracking-[.16em] text-slate-400">
              On this page
            </p>
            {state.headings.length ? (
              <nav className="space-y-1 border-l border-slate-200">
                {state.headings.map((heading) => (
                  <button
                    key={heading.position}
                    onClick={() =>
                      editor
                        .chain()
                        .focus()
                        .setTextSelection(heading.position + 1)
                        .scrollIntoView()
                        .run()
                    }
                    className="block w-full truncate border-l-2 border-transparent py-2 pr-1 text-left text-xs text-slate-500 hover:border-teal-600 hover:text-teal-700"
                    style={{ paddingLeft: `${12 + (heading.level - 1) * 8}px` }}
                  >
                    {heading.text || "Untitled section"}
                  </button>
                ))}
              </nav>
            ) : (
              <p className="text-xs leading-6 text-slate-400">
                Add headings to give your document a little structure. They’ll
                appear here.
              </p>
            )}
            <div className="mt-10 rounded-lg border border-[#e0e7e4] bg-[#edf3ef] p-4">
              <p className="mb-2 text-xs font-medium text-[#47675f]">
                A little writing tip
              </p>
              <p className="text-xs leading-5 text-[#6d817a]">
                Type <kbd className="rounded bg-white px-1">#</kbd> and a space
                for a heading, or <kbd className="rounded bg-white px-1">-</kbd>{" "}
                for a list.
              </p>
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}
