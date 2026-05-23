import type { Root } from "mdast";
import { visit } from "unist-util-visit";

// MkDocs-style attribute lists for links: `[label](url){ .class #id }`. Today
// this powers buttons (`{ .md-button .md-button--primary }`); the same mechanism
// will later carry chart/image attributes. Parsing is string-based (no regex).
// The class names are the MkDocs convention; the actual styling lives in the
// consumer (docolin's layout.css), keeping this design-agnostic.

interface ParsedAttrs {
  classes: string[];
  id: string | null;
  /** Text after the closing brace, kept on the original text node. */
  rest: string;
}

function parseAttrList(text: string): ParsedAttrs | null {
  if (!text.startsWith("{")) return null;
  const close = text.indexOf("}");
  if (close === -1) return null;
  const classes: string[] = [];
  let id: string | null = null;
  for (const token of text.slice(1, close).trim().split(" ")) {
    const value = token.trim();
    if (value.startsWith(".")) classes.push(value.slice(1));
    else if (value.startsWith("#")) id = value.slice(1);
  }
  if (classes.length === 0 && id === null) return null;
  return { classes, id, rest: text.slice(close + 1) };
}

/** Attaches a trailing `{ ... }` attribute list to the preceding link. */
export function remarkAttrList() {
  return (tree: Root): undefined => {
    visit(tree, "link", (node, index, parent) => {
      if (parent === undefined || index === undefined) return;
      const next = parent.children.at(index + 1);
      if (next?.type !== "text") return;
      const parsed = parseAttrList(next.value);
      if (parsed === null) return;

      const data = node.data ?? (node.data = {});
      const props = data.hProperties ?? (data.hProperties = {});
      const existing = Array.isArray(props.className) ? props.className : [];
      props.className = [...existing, ...parsed.classes];
      if (parsed.id !== null) props.id = parsed.id;
      next.value = parsed.rest;
    });
  };
}
