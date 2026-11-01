export interface DocumentNode {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: DocumentNode[];
}

function escapeMarkdown(text: string) {
  return text.replace(/&/g, "&amp;").replace(/([\\`*_{}\[\]<>#!~])/g, "\\$1");
}

function escapeParagraphStarts(text: string) {
  return text
    // Literal paragraphs must not turn into lists, rules, or setext headings.
    .replace(/^( {0,3})([-+])(?=[\t ]|$)/gm, "$1\\$2")
    .replace(/^( {0,3}\d{1,9})([.)])(?=[\t ]|$)/gm, "$1\\$2")
    .replace(/^( {0,3})([-=])(?=[-=\t ]*$)/gm, "$1\\$2")
    // An entity preserves leading whitespace without creating an indented code block.
    .replace(/^( {4,}|\t)/gm, (indent) => `&#32;${indent.slice(1)}`);
}

/** Export the editor's parsed document, never untrusted HTML. */
export function toMarkdown(node: DocumentNode): string {
  const children = () => (node.content ?? []).map(toMarkdown).join("");
  switch (node.type) {
    case "text": {
      let text = escapeMarkdown(node.text ?? "");
      for (const mark of node.marks ?? []) {
        if (mark.type === "bold") text = `**${text}**`;
        if (mark.type === "italic") text = `*${text}*`;
        if (mark.type === "strike") text = `~~${text}~~`;
        if (mark.type === "code") {
          const raw = node.text ?? "";
          const fence = "`".repeat(
            Math.max(
              0,
              ...(raw.match(/`+/g) ?? []).map((part) => part.length),
            ) + 1,
          );
          text = `${fence} ${raw} ${fence}`;
        }
        if (
          mark.type === "link" &&
          typeof mark.attrs?.href === "string" &&
          /^(https?:|mailto:)/i.test(mark.attrs.href)
        ) {
          const destination = mark.attrs.href
            .replace(/[()<>`"\\\s\u0000-\u001f\u007f]/g, (value) =>
              value === "(" ? "%28" : value === ")" ? "%29" : encodeURIComponent(value),
            )
            .replace(/&/g, "&amp;");
          text = `[${text}](${destination})`;
        }
      }
      return text;
    }
    case "heading":
      return `${"#".repeat(Number(node.attrs?.level) || 1)} ${children()}\n\n`;
    case "paragraph":
      return `${escapeParagraphStarts(children())}\n\n`;
    case "hardBreak":
      return "  \n";
    case "horizontalRule":
      return "---\n\n";
    case "blockquote":
      return `${children()
        .trim()
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n")}\n\n`;
    case "codeBlock": {
      const raw = (node.content ?? [])
        .map((child) => child.text ?? "")
        .join("");
      const fence = "`".repeat(
        Math.max(2, ...(raw.match(/`+/g) ?? []).map((part) => part.length)) + 1,
      );
      return `${fence}\n${raw}\n${fence}\n\n`;
    }
    case "bulletList":
    case "orderedList":
      return (
        (node.content ?? [])
          .map((item, index) => {
            const prefix =
              node.type === "orderedList"
                ? `${Number(node.attrs?.start ?? 1) + index}. `
                : "- ";
            const lines = toMarkdown(item).trim().split("\n");
            return prefix + lines.join(`\n${" ".repeat(prefix.length)}`);
          })
          .join("\n") + "\n\n"
      );
    default:
      return children();
  }
}

/** Titles are editor text too, rather than raw Markdown or HTML. */
export function documentMarkdown(title: string, document: DocumentNode): string {
  const heading = title.replace(/[\r\n]+/g, " ").trim() || "Untitled document";
  return `# ${escapeMarkdown(heading)}\n\n${toMarkdown(document)}`;
}

export function downloadDocument(
  title: string,
  content: string,
  extension = "md",
) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${
    title
      .trim()
      .replace(/[^a-z0-9\-_ ]/gi, "")
      .slice(0, 100) || "Untitled"
  }.${extension}`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
