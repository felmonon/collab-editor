import assert from "node:assert/strict";
import { test } from "node:test";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { history, redoDepth, undoDepth } from "@tiptap/pm/history";
import { editorActionAvailability, syncExternalEditorContent } from "./editor-controls";

const document = (text: string, type = "paragraph") => ({
  type: "doc", content: [{ type, content: [{ type: "text", text }] }],
});

function headlessEditor(text = "Original saved draft", type = "paragraph") {
  const editor = new Editor({ element: null, extensions: [StarterKit], content: document(text, type) });
  // A real ProseMirror history plugin, without a browser or mounted DOM.
  editor.view.updateState(editor.state.reconfigure({ plugins: [history()] }));
  return editor;
}

test("received canonical content cannot be undone into an older document", () => {
  const editor = headlessEditor();
  let updates = 0;
  editor.on("update", () => updates++);
  try {
    syncExternalEditorContent(editor, document("A collaborator's newer saved version"));
    assert.equal(editor.state.doc.textContent, "A collaborator's newer saved version");
    assert.equal(undoDepth(editor.state), 0);
    assert.equal(redoDepth(editor.state), 0);
    assert.equal(editor.commands.undo(), false);
    assert.equal(updates, 0, "receiving a saved revision must not trigger autosave");
  } finally { editor.destroy(); }
});

test("local undo and redo still work after a canonical replacement", () => {
  const editor = headlessEditor();
  try {
    syncExternalEditorContent(editor, document("Latest"));
    editor.view.dispatch(editor.state.tr.insertText(" local edit", 7));
    assert.equal(editor.state.doc.textContent, "Latest local edit");
    assert.equal(editor.commands.undo(), true);
    assert.equal(editor.state.doc.textContent, "Latest");
    assert.equal(editor.commands.redo(), true);
    assert.equal(editor.state.doc.textContent, "Latest local edit");
  } finally { editor.destroy(); }
});

test("old local undo entries cannot remove a subsequently received revision", () => {
  const editor = headlessEditor();
  try {
    editor.view.dispatch(editor.state.tr.insertText(" own", 21));
    syncExternalEditorContent(editor, document("Received canonical revision"));
    editor.commands.undo();
    assert.equal(editor.state.doc.textContent, "Received canonical revision");
  } finally { editor.destroy(); }
});

test("formatting availability follows the selected block without changing content", () => {
  const code = headlessEditor("const example = true", "codeBlock");
  const paragraph = headlessEditor();
  try {
    const before = code.state.doc.toJSON();
    const disabled = editorActionAvailability(code);
    assert.equal(disabled.bold, false);
    assert.equal(disabled.italic, false);
    assert.equal(disabled.underline, false);
    assert.equal(disabled.strike, false);
    assert.equal(disabled.code, true, "a code block can still be toggled off");
    assert.deepEqual(code.state.doc.toJSON(), before);
    const enabled = editorActionAvailability(paragraph);
    assert.equal(enabled.bold, true);
    assert.equal(enabled.italic, true);
    assert.equal(enabled.underline, true);
    assert.equal(enabled.strike, true);
  } finally { code.destroy(); paragraph.destroy(); }
});
