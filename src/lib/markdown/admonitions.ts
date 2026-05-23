import type { Marked, Tokens } from "marked";
import { icon, type IconName } from "./icons";

// Admonition / callout block extension implementing MkDocs Material syntax:
//
//   !!! type "Optional title"     static callout
//   ??? type "Optional title"     collapsible, starts collapsed
//   ???+ type "Optional title"    collapsible, starts open
//
// followed by 4-space-indented body content. The format is indentation-
// significant (like MkDocs): the body is everything indented under the opener,
// so code blocks, lists, and nested admonitions all work by going deeper.
//
// We implement this as a custom marked block tokenizer rather than via
// marked-directive, which can't express indentation-significant nesting. CLAUDE
// 3.8 sanctions parsing here; the opener and body split are done with string
// operations (no regex), and the body is fed back through marked's own block
// lexer so every construct that works at the top level works inside a callout.
// Pinned tests live in admonitions.test.ts.
//
// Type set: note / info / tip / warning / danger. Unknown types (typos, or
// extension types like steps/cards/accordion before they get custom renderers)
// fall back to a neutral box so mistakes stay visible and extensions degrade
// gracefully, matching MkDocs behavior. Colors are light-only (dark mode is a
// separate, later workstream); warning/tip use raw Tailwind status scales
// because the theme has no warning/tip token, matching the callout precedent.

interface AdmonitionConfig {
  icon: IconName;
  /** Border color (applied to all sides; the left edge is 4px). */
  border: string;
  /** Header band background. */
  header: string;
  /** Body background tint. */
  body: string;
  /** Icon + title color in the header. */
  text: string;
}

const CALLOUTS: Record<string, AdmonitionConfig> = {
  note: {
    icon: "pencil",
    border: "border-foreground/20",
    header: "bg-muted",
    body: "bg-muted/30",
    text: "text-foreground",
  },
  info: {
    icon: "info",
    border: "border-primary/40",
    header: "bg-primary/10",
    body: "bg-primary/5",
    text: "text-primary",
  },
  tip: {
    icon: "lightbulb",
    border: "border-emerald-500/40",
    header: "bg-emerald-100",
    body: "bg-emerald-50",
    text: "text-emerald-900",
  },
  warning: {
    icon: "triangle-alert",
    border: "border-amber-500/50",
    header: "bg-amber-100",
    body: "bg-amber-50",
    text: "text-amber-900",
  },
  danger: {
    icon: "octagon-alert",
    border: "border-destructive/40",
    header: "bg-destructive/10",
    body: "bg-destructive/5",
    text: "text-destructive",
  },
};

const NEUTRAL = CALLOUTS.note;

/** Parsed admonition: the token (its body tokens still empty) plus the dedented
 *  body string to feed through the block lexer. `null` if `src` isn't one. */
export interface AdmonitionToken extends Tokens.Generic {
  type: "admonition";
  /** Whether the admonition renders as a collapsible `<details>`. */
  collapsible: boolean;
  /** Whether a collapsible admonition starts open. */
  open: boolean;
  /** The type word from the opener ("warning", "steps", ...); "" if omitted. */
  atype: string;
  /** Resolved header title (explicit, else the capitalized type). */
  title: string;
  tokens: Tokens.Generic[];
}

export interface ParsedAdmonition {
  token: AdmonitionToken;
  /** Dedented body, ready for `lexer.blockTokens`. */
  body: string;
}

function capitalize(value: string): string {
  if (value.length === 0) return "Note";
  return value[0].toUpperCase() + value.slice(1);
}

// Parses the opener line. Returns null if it isn't an admonition opener so the
// tokenizer can fall through to marked's normal block rules.
function parseOpener(
  firstLine: string,
): { collapsible: boolean; open: boolean; atype: string; title: string } | null {
  let line = firstLine;
  while (line.endsWith("\r") || line.endsWith(" ") || line.endsWith("\t")) {
    line = line.slice(0, -1);
  }

  let collapsible = false;
  let open = false;
  let markerLength: number;
  if (line.startsWith("???+")) {
    collapsible = true;
    open = true;
    markerLength = 4;
  } else if (line.startsWith("???")) {
    collapsible = true;
    markerLength = 3;
  } else if (line.startsWith("!!!")) {
    markerLength = 3;
  } else {
    return null;
  }

  let rest = line.slice(markerLength);
  // The marker must be followed by whitespace (or nothing), so "!!!important"
  // stays a paragraph rather than a typeless admonition.
  if (rest.length > 0 && !rest.startsWith(" ") && !rest.startsWith("\t")) return null;
  rest = rest.trim();

  // Strip an optional attr-list segment ({ cols=2 }, etc.). Its contents are
  // parsed by a later step (card columns); here we just keep it out of the
  // type/title so it doesn't pollute them.
  const brace = rest.indexOf("{");
  if (brace !== -1) rest = rest.slice(0, brace).trim();

  // Optional quoted title; the type is the first word before it.
  let title: string | null = null;
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

  return { collapsible, open, atype, title: title ?? capitalize(atype) };
}

// Removes one level (4 spaces or a tab) of leading indentation from each line.
// Blank / under-indented lines pass through unchanged.
function dedent(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if (line.startsWith("    ")) out.push(line.slice(4));
    else if (line.startsWith("\t")) out.push(line.slice(1));
    else out.push(line);
  }
  return out.join("\n");
}

function isIndented(line: string): boolean {
  return line.startsWith("    ") || line.startsWith("\t");
}

/** Parses an admonition from the start of `src`, or returns null. */
export function parseAdmonition(src: string): ParsedAdmonition | null {
  const firstNewline = src.indexOf("\n");
  const firstLine = firstNewline === -1 ? src : src.slice(0, firstNewline);
  const opener = parseOpener(firstLine);
  if (opener === null) return null;

  // Consume the indented body. Blank lines are tentative: they only stay in the
  // block if more indented content follows, so trailing blanks before the next
  // top-level block are excluded. `lastContentEnd` tracks the end (exclusive) of
  // the last committed content line, so `raw` covers exactly the consumed source.
  const bodyStart = firstNewline === -1 ? src.length : firstNewline + 1;
  let cursor = bodyStart;
  let lastContentEnd = bodyStart;
  while (cursor < src.length) {
    const newline = src.indexOf("\n", cursor);
    const lineEnd = newline === -1 ? src.length : newline;
    const next = newline === -1 ? src.length : newline + 1;
    const line = src.slice(cursor, lineEnd);
    if (line.trim() === "") {
      cursor = next;
      continue;
    }
    if (isIndented(line)) {
      cursor = next;
      lastContentEnd = next;
      continue;
    }
    break;
  }

  const raw = src.slice(0, lastContentEnd);
  const body = dedent(src.slice(bodyStart, lastContentEnd));

  const token: AdmonitionToken = {
    type: "admonition",
    raw,
    collapsible: opener.collapsible,
    open: opener.open,
    atype: opener.atype,
    title: opener.title,
    tokens: [],
  };
  return { token, body };
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const BODY_RESET = "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0";

/** Renders a parsed admonition given its already-rendered inner HTML. Pure, so
 *  tests can assert the markup without a full marked instance. */
export function renderAdmonition(token: AdmonitionToken, innerHtml: string): string {
  const cfg = CALLOUTS[token.atype] ?? NEUTRAL;
  const iconSvg = icon(cfg.icon, "size-4 shrink-0");
  const title = escapeHtml(token.title);
  const body = `<div class="px-4 py-3 ${cfg.body} ${BODY_RESET}">${innerHtml}</div>`;

  if (token.collapsible) {
    const openAttr = token.open ? " open" : "";
    // The chevron rotates on open; the transition is gated on prefers-reduced-
    // motion (motion-safe), and the body's height animation lives in layout.css
    // keyed off .markdown-collapsible.
    const chevron = icon(
      "chevron-down",
      "ml-auto size-4 shrink-0 group-open:rotate-180 motion-safe:transition-transform",
    );
    return (
      `<details${openAttr} class="markdown-collapsible group my-4 border border-l-4 ${cfg.border}">` +
      `<summary class="flex cursor-pointer list-none items-center gap-2 px-4 py-2 text-sm font-semibold ${cfg.header} ${cfg.text} [&::-webkit-details-marker]:hidden">` +
      `${iconSvg}<span>${title}</span>${chevron}</summary>` +
      `${body}</details>`
    );
  }

  return (
    `<div class="my-4 border border-l-4 ${cfg.border}">` +
    `<div class="flex items-center gap-2 px-4 py-2 text-sm font-semibold ${cfg.header} ${cfg.text}">` +
    `${iconSvg}<span>${title}</span></div>` +
    `${body}</div>`
  );
}

// Index of the next admonition opener so marked stops a paragraph before it.
function findStart(src: string): number | undefined {
  let best = -1;
  for (const marker of ["!!!", "???"]) {
    if (src.startsWith(marker)) return 0;
    const at = src.indexOf("\n" + marker);
    if (at !== -1 && (best === -1 || at + 1 < best)) best = at + 1;
  }
  return best === -1 ? undefined : best;
}

/** Registers the admonition extension on a Marked instance. */
export function applyAdmonitions(marked: Marked): void {
  marked.use({
    extensions: [
      {
        name: "admonition",
        level: "block",
        // Recurse into the body tokens during walkTokens so shiki (which runs in
        // walkTokens) highlights code blocks nested inside callouts.
        childTokens: ["tokens"],
        start(src) {
          return findStart(src);
        },
        tokenizer(src) {
          const parsed = parseAdmonition(src);
          if (parsed === null) return undefined;
          this.lexer.blockTokens(parsed.body, parsed.token.tokens);
          return parsed.token;
        },
        renderer(token) {
          const inner = this.parser.parse((token as AdmonitionToken).tokens);
          return renderAdmonition(token as AdmonitionToken, inner);
        },
      },
    ],
  });
}
