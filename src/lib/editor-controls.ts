import type { Content, Editor } from "@tiptap/core";

export function syncExternalEditorContent(editor: Editor, content: Content) {
  // Canonical updates and explicit draft replacements are not local typing.
  // Otherwise Undo can restore an older revision and autosave it over a peer.
  return editor
    .chain()
    .setMeta("addToHistory", false)
    .setContent(content, { emitUpdate: false })
    .run();
}

export function editorActionAvailability(editor: Editor) {
  return {
    bold: editor.can().toggleBold(),
    italic: editor.can().toggleItalic(),
    underline: editor.can().toggleUnderline(),
    strike: editor.can().toggleStrike(),
    bullet: editor.can().toggleBulletList(),
    ordered: editor.can().toggleOrderedList(),
    quote: editor.can().toggleBlockquote(),
    code: editor.can().toggleCodeBlock(),
    divider: editor.can().setHorizontalRule(),
    paragraph: editor.can().setParagraph(),
    heading1: editor.can().toggleHeading({ level: 1 }),
    heading2: editor.can().toggleHeading({ level: 2 }),
    heading3: editor.can().toggleHeading({ level: 3 }),
  };
}
