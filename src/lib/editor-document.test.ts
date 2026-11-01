import { test } from "node:test";
import assert from "node:assert/strict";
import { documentMarkdown, toMarkdown } from "./editor-document";

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

test("literal paragraph starts remain text rather than headings, lists, or dividers", () => {
  for (const [text, expected] of [
    ["# a literal heading", "\\# a literal heading"],
    ["- a literal bullet", "\\- a literal bullet"],
    ["+ another literal bullet", "\\+ another literal bullet"],
    ["1. a literal number", "1\\. a literal number"],
    ["42) another literal number", "42\\) another literal number"],
    ["---", "\\---"],
    ["===", "\\==="],
    ["~~~", "\\~\\~\\~"],
    ["    indented text", "&#32;   indented text"],
    ["&copy; is literal text", "&amp;copy; is literal text"],
  ]) {
    assert.equal(toMarkdown({ type: "paragraph", content: [{ type: "text", text }] }), `${expected}\n\n`);
  }
});

test("split text nodes and hard breaks cannot introduce unintended block syntax", () => {
  const markdown = toMarkdown({
    type: "paragraph",
    content: [
      { type: "text", text: "1" },
      { type: "text", text: ". literal numbering" },
      { type: "hardBreak" },
      { type: "text", text: "- still the same paragraph" },
    ],
  });
  assert.equal(markdown, "1\\. literal numbering  \n\\- still the same paragraph\n\n");
});

test("actual list structure is retained while a list item's literal punctuation is escaped", () => {
  assert.equal(toMarkdown({
    type: "bulletList",
    content: [{
      type: "listItem",
      content: [{ type: "paragraph", content: [{ type: "text", text: "1. literal item" }] }],
    }],
  }), "- 1\\. literal item\n\n");
});

test("the exported title is one safe heading with literal HTML and Markdown punctuation", () => {
  const markdown = documentMarkdown("<img src=x onerror=alert(1)>\r\n# Title &copy; ###", {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Body stays here." }] }],
  });
  assert.equal(markdown, "# \\<img src=x onerror=alert(1)\\> \\# Title &amp;copy; \\#\\#\\#\n\nBody stays here.\n\n");
  assert.equal(documentMarkdown(" \n ", { type: "doc", content: [] }), "# Untitled document\n\n");
});

test("code retains literal entities and Markdown characters instead of escaping their content", () => {
  assert.equal(toMarkdown({ type: "codeBlock", content: [{ type: "text", text: "# &copy; <tag>" }] }), "```\n# &copy; <tag>\n```\n\n");
});

test("link destinations cannot introduce raw HTML or reinterpret literal entity text", () => {
  assert.equal(toMarkdown({
    type: "text",
    text: "Reference",
    marks: [{ type: "link", attrs: { href: 'https://example.test/<script>`text`</script>?a=&copy;&b=(draft)' } }],
  }), "[Reference](https://example.test/%3Cscript%3E%60text%60%3C/script%3E?a=&amp;copy;&amp;b=%28draft%29)");
});
