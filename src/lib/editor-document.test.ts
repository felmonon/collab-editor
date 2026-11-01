import { test } from "node:test";
import assert from "node:assert/strict";
import { toMarkdown } from "./editor-document";

test("exports headings, formatting, ordered lists, and quotes", () => {
  const markdown = toMarkdown({
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Plan" }],
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "Go", marks: [{ type: "bold" }] }],
      },
      {
        type: "orderedList",
        attrs: { start: 3 },
        content: [
          {
            type: "listItem",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "Ship" }] },
            ],
          },
        ],
      },
      {
        type: "blockquote",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Keep writing" }],
          },
        ],
      },
    ],
  });
  assert.equal(markdown, "## Plan\n\n**Go**\n\n3. Ship\n\n> Keep writing\n\n");
});

test("escapes literal markup and never exports executable links", () => {
  assert.equal(
    toMarkdown({
      type: "text",
      text: "<script>*literal*</script>",
      marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
    }),
    "\\<script\\>\\*literal\\*\\</script\\>",
  );
});

test("uses code fences longer than backticks within the code", () => {
  assert.equal(
    toMarkdown({
      type: "codeBlock",
      content: [{ type: "text", text: "```\nexample" }],
    }),
    "````\n```\nexample\n````\n\n",
  );
});
