export interface DocumentNode {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: DocumentNode[];
}

function escapeMarkdown(text: string) {
  return text.replace(/([\\`*_{}\[\]<>])/g, "\\$1");
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
          text = `[${text}](${mark.attrs.href.replace(/[()\s]/g, (value) => (value === "(" ? "%28" : value === ")" ? "%29" : encodeURIComponent(value)))})`;
        }
      }
      return text;
    }
    case "heading":
      return `${"#".repeat(Number(node.attrs?.level) || 1)} ${children()}\n\n`;
    case "paragraph":
      return `${children()}\n\n`;
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
