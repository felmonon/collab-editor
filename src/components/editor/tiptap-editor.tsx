"use client";

import {
  useEditor,
  useEditorState,
  EditorContent,
  type Editor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
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
import { downloadDocument, documentMarkdown } from "@/lib/editor-document";

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
  expanded,
  controls,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  expanded?: boolean;
  controls?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      aria-expanded={expanded}
      aria-controls={controls}
      disabled={disabled}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315bee] disabled:cursor-not-allowed disabled:opacity-30 sm:h-9 sm:w-9 ${active ? "bg-[#eef2ff] text-[#315bee]" : "text-[#646b7b] hover:bg-[#f1f3f8] hover:text-[#171923]"}`}
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
        className="mx-auto min-h-[600px] max-w-[860px] animate-pulse rounded-2xl border border-[#e6e8ef] bg-white"
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
  const [outlineOpen, setOutlineOpen] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1280px)").matches,
  );
  const outlineId = useId();
  const titleRef = useRef<HTMLTextAreaElement>(null);
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

  useEffect(() => {
    const field = titleRef.current;
    if (!field) return;
    function resizeTitle() {
      if (!field) return;
      field.style.height = "auto";
      field.style.height = `${field.scrollHeight}px`;
    }
    resizeTitle();
    window.addEventListener("resize", resizeTitle);
    return () => window.removeEventListener("resize", resizeTitle);
  }, [title, outlineOpen]);

  if (!editor || !state)
    return (
      <div
        className="mx-auto min-h-[600px] max-w-[860px] animate-pulse rounded-2xl border border-[#e6e8ef] bg-white"
        aria-label="Loading editor"
      />
    );

  return (
    <section
      className={
        focusMode ? "fixed inset-0 z-50 overflow-y-auto bg-[#f6f7fb]" : ""
      }
      aria-label="Writing workspace"
    >
      <div
        className={`editor-toolbar sticky ${focusMode ? "top-0" : "top-16"} z-20 border-y border-[#e6e8ef] bg-white/95 backdrop-blur-xl`}
      >
        <div className="mx-auto flex max-w-[1360px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-8">
          {editable ? (
            <div className="flex min-w-0 basis-full items-center gap-2 overflow-x-auto pb-1 sm:flex-1 sm:basis-auto sm:pb-0">
              <div
                role="group"
                aria-label="History"
                className="flex shrink-0 items-center gap-0.5"
              >
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
              </div>
              <span
                aria-hidden="true"
                className="mx-1 h-5 w-px shrink-0 bg-[#e6e8ef]"
              />
              <select
                aria-label="Text style"
                value={state.heading}
                className="h-11 w-32 shrink-0 rounded-lg border-0 bg-[#f6f7fb] px-3 text-xs font-medium text-[#353b49] outline-none focus-visible:ring-2 focus-visible:ring-[#315bee] sm:h-9"
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
              <span
                aria-hidden="true"
                className="mx-1 h-5 w-px shrink-0 bg-[#e6e8ef]"
              />
              <div
                role="group"
                aria-label="Text formatting"
                className="flex shrink-0 items-center gap-0.5"
              >
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
              </div>
              <span
                aria-hidden="true"
                className="mx-1 h-5 w-px shrink-0 bg-[#e6e8ef]"
              />
              <div
                role="group"
                aria-label="Document structure"
                className="flex shrink-0 items-center gap-0.5"
              >
                <MenuButton
                  label="Bullet list"
                  active={state.bullet}
                  onClick={() =>
                    editor.chain().focus().toggleBulletList().run()
                  }
                >
                  <List size={17} />
                </MenuButton>
                <MenuButton
                  label="Numbered list"
                  active={state.ordered}
                  onClick={() =>
                    editor.chain().focus().toggleOrderedList().run()
                  }
                >
                  <ListOrdered size={17} />
                </MenuButton>
                <MenuButton
                  label="Blockquote"
                  active={state.quote}
                  onClick={() =>
                    editor.chain().focus().toggleBlockquote().run()
                  }
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
                  onClick={() =>
                    editor.chain().focus().setHorizontalRule().run()
                  }
                >
                  <Minus size={17} />
                </MenuButton>
              </div>
            </div>
          ) : (
            <span className="text-xs font-medium text-[#626977]">
              View-only document
            </span>
          )}
          <div
            role="group"
            aria-label="Document tools"
            className="ml-auto flex items-center gap-0.5 sm:border-l sm:border-[#e6e8ef] sm:pl-3"
          >
            <MenuButton
              label="Download Markdown"
              onClick={() =>
                downloadDocument(
                  title || "Untitled",
                  documentMarkdown(title || "Untitled", editor.getJSON()),
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
              expanded={outlineOpen}
              controls={outlineId}
              onClick={() => setOutlineOpen(!outlineOpen)}
            >
              <PanelRight size={16} />
            </MenuButton>
          </div>
        </div>
      </div>
      <div
        className={`mx-auto flex max-w-[1280px] flex-col items-center justify-center gap-6 px-4 py-6 sm:px-8 sm:py-10 xl:flex-row xl:items-start xl:gap-10 ${focusMode ? "min-h-screen" : ""}`}
      >
        {outlineOpen && (
          <aside
            id={outlineId}
            className={`w-full max-w-[860px] shrink-0 rounded-xl border border-[#e6e8ef] bg-white p-5 xl:sticky xl:order-last xl:w-48 xl:max-w-none xl:border-0 xl:bg-transparent xl:px-0 xl:pt-5 ${focusMode ? "xl:top-24" : "xl:top-40"}`}
            aria-label="Document outline"
          >
            <p className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.12em] text-[#626977]">
              <PanelRight size={13} /> In this document
            </p>
            {state.headings.length ? (
              <nav className="max-h-60 space-y-0.5 overflow-y-auto border-l border-[#e0e4ef] xl:max-h-[50vh]">
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
                    className="block min-h-11 w-full truncate border-l-2 border-transparent py-2 pr-2 text-left text-xs leading-5 text-[#626977] transition-colors hover:border-[#315bee] hover:bg-[#eef2ff] hover:text-[#315bee] focus-visible:outline-2 focus-visible:outline-[#315bee] sm:min-h-9"
                    style={{ paddingLeft: `${14 + (heading.level - 1) * 8}px` }}
                  >
                    {heading.text || "Untitled section"}
                  </button>
                ))}
              </nav>
            ) : (
              <p className="text-xs leading-6 text-[#626977]">
                Your document’s headings will appear here.
              </p>
            )}
          </aside>
        )}
        <div className="w-full min-w-0 max-w-[860px] flex-1">
          <div className="editor-paper overflow-hidden rounded-xl border border-[#e6e8ef] bg-white shadow-[0_6px_30px_-12px_rgba(23,25,35,0.08)] sm:rounded-2xl">
            <div className="px-6 pt-10 sm:px-16 sm:pt-14">
              <textarea
                ref={titleRef}
                rows={1}
                aria-label="Document title"
                value={title}
                maxLength={200}
                readOnly={!editable || !onTitleChange}
                onChange={(event) =>
                  onTitleChange?.(event.target.value.replace(/[\r\n]+/g, " "))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    editor.chain().focus("start").run();
                  }
                }}
                placeholder="Untitled document"
                className="block w-full resize-none overflow-hidden border-0 bg-transparent pb-6 text-[30px] font-semibold leading-tight tracking-[-0.045em] text-[#171923] outline-none placeholder:text-[#b1b5c0] focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-[#315bee]/25 sm:text-[40px]"
              />
              <div className="h-px bg-[#eef0f5]" />
            </div>
            <EditorContent editor={editor} />
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-3 px-2 py-5 text-[11px] text-[#626977]">
            <div className="flex items-center gap-3 sm:gap-5">
              <span>{state.words.toLocaleString()} words</span>
              <span className="hidden sm:inline">
                {state.characters.toLocaleString()} characters
              </span>
              <span>{Math.max(1, Math.ceil(state.words / 200))} min read</span>
            </div>
            <span>
              {focusMode
                ? "Esc to exit focus mode"
                : editable
                  ? "Editing enabled"
                  : "Read only"}
            </span>
          </footer>
        </div>
      </div>
    </section>
  );
}
