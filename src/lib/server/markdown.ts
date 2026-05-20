import { Marked } from "marked";
import { codeToHtml } from "shiki";
import {
  applySharedExtensions,
  applyShikiHighlighting,
  plainTextFromTokens,
  sanitizeHtml,
  slugify,
  RENDERER_VERSION,
} from "$lib/markdown-shared";

// Server markdown renderer. Builds the same instance the client preview builds
// (shared config in $lib/markdown-shared: callouts, links, heading anchors,
// shiki highlighting, sanitization), the only difference being that shiki is
// imported statically here (server bundle) and lazily on the client. So the
// published doco and the composer preview render identically.
//
// Source of truth (markdown) lives in the DB; rendered HTML is computed on read
// in load functions and cached at the edge. Bumping RENDERER_VERSION (in the
// shared module) invalidates every cached page on the next read.
//
// Used by every server surface that displays user-authored text (inbox, docos,
// versions, discussions). Keep this the only server path that produces HTML so
// upgrades stay one-line and consistent everywhere.

export { RENDERER_VERSION };

const serverMarked = new Marked();
applySharedExtensions(serverMarked);
applyShikiHighlighting(serverMarked, codeToHtml);

export async function renderMarkdown(source: string): Promise<string> {
  const rawHtml = await serverMarked.parse(source, { async: true });
  return sanitizeHtml(rawHtml);
}

// ---------- TOC extraction for the doco viewer ----------

export interface TocEntry {
  // Heading depth: 2, 3, or 4 in practice. Kept as plain `number` because
  // marked's heading token types `depth` as `number` and narrowing to a
  // literal union via !== checks doesn't propagate cleanly.
  level: number;
  text: string;
  id: string;
}

// Walks the markdown source via the lexer and pulls h2 and h3 headings. h1 is
// excluded since the page already shows the doco title separately; h4+ is
// excluded to keep the TOC focused on the structural skeleton.
export function extractDocoToc(source: string): TocEntry[] {
  const tokens = serverMarked.lexer(source);
  const out: TocEntry[] = [];
  for (const t of tokens) {
    if (t.type !== "heading") continue;
    const depth = Number(t.depth);
    if (depth !== 2 && depth !== 3) continue;
    const text = plainTextFromTokens(t.tokens);
    out.push({
      level: depth,
      text,
      id: slugify(text),
    });
  }
  return out;
}
