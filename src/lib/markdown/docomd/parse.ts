// Pure string parsing for an MkDocs admonition opener's meta: the part after the
// !!!/???/???+ marker on the first line, e.g. `warning "Secure Boot" { cols=2 }`.
// No markdown-engine dependency, so the renderer and (later) the Prettier plugin
// can both reuse it. The micromark construct handles structure and children;
// this only interprets the opener meta.

export interface AdmonitionMeta {
  /** The type word ("warning", "steps", ...); "" if omitted. */
  atype: string;
  /** The explicit quoted title, or "" if none was given. */
  title: string;
  /** Raw attr-list contents (between `{` and `}`), or "" if absent. */
  attrs: string;
}

/** Parses the meta string after the marker. */
export function parseAdmonitionMeta(meta: string): AdmonitionMeta {
  let rest = meta.trim();

  // Pull off an optional attr-list segment ({ cols=2 }, etc.) so it does not
  // bleed into the type or title. Its contents are interpreted per construct
  // (e.g. card columns) by the renderer.
  let attrs = "";
  const brace = rest.indexOf("{");
  if (brace !== -1) {
    const close = rest.indexOf("}", brace + 1);
    attrs = (close === -1 ? rest.slice(brace + 1) : rest.slice(brace + 1, close)).trim();
    rest = rest.slice(0, brace).trim();
  }

  // An optional quoted title; the type is the first word before it.
  let title = "";
  let typePart = rest;
  const firstQuote = rest.indexOf('"');
  if (firstQuote !== -1) {
    const secondQuote = rest.indexOf('"', firstQuote + 1);
    if (secondQuote !== -1) {
      title = rest.slice(firstQuote + 1, secondQuote);
      typePart = rest.slice(0, firstQuote);
    }
  }

  const atype = typePart.trim().split(" ")[0] ?? "";
  return { atype, title, attrs };
}

/** The header title to display: the explicit title, else the capitalized type. */
export function admonitionTitle(meta: { atype: string; title: string }): string {
  if (meta.title.length > 0) return meta.title;
  if (meta.atype.length === 0) return "Note";
  return meta.atype[0].toUpperCase() + meta.atype.slice(1);
}

/**
 * Given the raw source span of an admonition (opener line + indented body),
 * drops the opener line and removes one level of body indentation (4 spaces or a
 * tab) from each remaining line, then trims trailing blank lines. The result is
 * ready to re-parse as standalone markdown.
 */
export function dedentBody(raw: string): string {
  const firstBreak = raw.indexOf("\n");
  if (firstBreak === -1) return "";
  const out: string[] = [];
  for (const line of raw.slice(firstBreak + 1).split("\n")) {
    if (line.startsWith("    ")) out.push(line.slice(4));
    else if (line.startsWith("\t")) out.push(line.slice(1));
    else out.push(line);
  }
  let body = out.join("\n");
  while (body.length > 0) {
    const last = body[body.length - 1];
    if (last === "\n" || last === "\r" || last === " " || last === "\t") body = body.slice(0, -1);
    else break;
  }
  return body;
}
