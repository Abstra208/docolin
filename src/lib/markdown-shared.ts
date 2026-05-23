import { Marked, type Tokens } from "marked";
import DOMPurify from "isomorphic-dompurify";
import { applyAdmonitions } from "$lib/markdown/admonitions";
import { slugify } from "$lib/slug";

// Re-exported so existing markdown consumers keep importing slugify from here;
// the implementation lives in $lib/slug (no markdown deps) so URL helpers can
// use it without pulling in marked / DOMPurify.
export { slugify };

// Isomorphic markdown config shared by the server renderer ($lib/server/markdown)
// and the client-side composer preview. Everything, callouts, links, heading
// anchors, shiki highlighting, sanitization, is defined once here so the
// preview is byte-identical to the published doco. The only difference is HOW
// shiki is loaded: the server imports it statically, while the client preview
// lazy-imports it (see renderMarkdownPreview) so the heavy highlighter never
// ships in the initial bundle and never reaches readers, who get
// server-rendered HTML. Rendering stays off the server (Run Lean) for previews.

// Bump to invalidate every cached rendered page on next read (it changes the
// cache key); no DB backfill needed. Lives here because both render paths build
// on this config.
export const RENDERER_VERSION = "1";

// Sanitizer allowlist additions: renderers emit Tailwind classes, the heading
// renderer emits id="" for TOC anchors, shiki emits inline style="color: ..."
// on code spans, the link renderer emits target/rel, and collapsible
// admonitions emit <details open>.
export const SANITIZE_ADD_ATTR = ["class", "target", "rel", "id", "style", "open"];

// Applies the isomorphic extensions to a Marked instance: the MkDocs-style
// admonition blocks (callouts + collapsibles), the external-link renderer (new
// tab + noopener), and heading ids for TOC anchoring. Code-block highlighting is
// intentionally not here, see the file header.
export function applySharedExtensions(marked: Marked): void {
  applyAdmonitions(marked);

  // External destinations (mailto, http, https, anything not starting with "/"
  // or "#") open in a new tab with noopener; internal links keep same-tab nav.
  // Heading ids match extractDocoToc's slugs so anchors line up.
  marked.use({
    renderer: {
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        const titleAttr = title ? ` title="${title}"` : "";
        const isInternal = href.startsWith("/") || href.startsWith("#");
        const externalAttrs = isInternal ? "" : ' target="_blank" rel="noopener noreferrer"';
        return `<a href="${href}"${titleAttr}${externalAttrs}>${text}</a>`;
      },
      heading({ tokens, depth }) {
        const inner = this.parser.parseInline(tokens);
        const plain = plainTextFromTokens(tokens);
        const id = slugify(plain);
        return `<h${String(depth)} id="${id}">${inner}</h${String(depth)}>\n`;
      },
      // GFM task-list checkbox, styled to match the shadcn Checkbox (we can't
      // mount the Svelte component into rendered HTML, so we emit the same look:
      // a square box, primary fill + check icon when ticked). Read-only, like
      // GitHub renders task lists. Class literals live here so Tailwind picks
      // them up (same as the callouts above).
      checkbox({ checked }) {
        const box =
          "mr-2 inline-flex size-4 shrink-0 items-center justify-center border align-[-0.2em]";
        if (checked) {
          return `<span role="checkbox" aria-checked="true" aria-disabled="true" class="${box} border-primary bg-primary text-primary-foreground"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="size-3"><path d="M20 6 9 17l-5-5"/></svg></span>`;
        }
        return `<span role="checkbox" aria-checked="false" aria-disabled="true" class="${box} border-input bg-background"></span>`;
      },
      // Drop the list bullet on task items so the checkbox is the only marker
      // (GitHub-style). Non-task items keep the default rendering.
      listitem(item) {
        const inner = this.parser.parse(item.tokens);
        if (item.task) return `<li class="list-none">${inner}</li>\n`;
        return `<li>${inner}</li>\n`;
      },
    },
  });

  marked.use({ gfm: true, breaks: false });
}

// Sanitizes rendered HTML with the shared allowlist. One sanitize step for both
// render paths so the security surface is identical.
export function sanitizeHtml(raw: string): string {
  return DOMPurify.sanitize(raw, { ADD_ATTR: SANITIZE_ADD_ATTR });
}

// Shiki integration, parameterized by the highlighter so the server can pass a
// statically-imported codeToHtml and the client a lazily-imported one. The
// canonical marked v18 async pattern: do the await in walkTokens, stash the
// result on the token, read it back in a sync code renderer (an async renderer
// yields "[object Promise]"). github-light matches the light-only theme;
// unknown grammars fall back to a plain escaped block.
export type ShikiHighlighter = (
  code: string,
  options: { lang: string; theme: string },
) => Promise<string>;

interface ShikiCachedToken extends Tokens.Code {
  shikiHtml?: string;
}

function escapeForPre(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function applyShikiHighlighting(marked: Marked, codeToHtml: ShikiHighlighter): void {
  marked.use({
    async: true,
    async walkTokens(token) {
      if (token.type !== "code") return;
      const t = token as ShikiCachedToken;
      const lang = t.lang === undefined || t.lang === "" ? "text" : t.lang;
      try {
        t.shikiHtml = await codeToHtml(t.text, { lang, theme: "github-light" });
      } catch {
        t.shikiHtml = `<pre><code>${escapeForPre(t.text)}</code></pre>`;
      }
    },
    renderer: {
      code(token) {
        const t = token as ShikiCachedToken;
        if (typeof t.shikiHtml === "string") return t.shikiHtml;
        return `<pre><code>${escapeForPre(t.text)}</code></pre>`;
      },
    },
  });
  marked.setOptions({ async: true });
}

// Lazily-built singleton for client-side preview rendering.
let previewMarked: Marked | null = null;

// Live preview render for the composer, run on the client. Lazy-imports shiki
// on first use so the highlighter is a separate on-demand chunk, off the
// initial bundle and never sent to readers. Uses the exact same shared config +
// shiki + theme as the server, so the preview matches the published doco.
//
// Tradeoff: shiki's default bundle is sizeable. It's lazy (only when a writer
// opens Preview), cached after first load, and off the read path, so the weight
// only ever hits authors, once. A fine-grained shiki bundle is the follow-up if
// that chunk needs trimming.
export async function renderMarkdownPreview(source: string): Promise<string> {
  if (previewMarked === null) {
    const { codeToHtml } = await import("shiki");
    const marked = new Marked();
    applySharedExtensions(marked);
    applyShikiHighlighting(marked, codeToHtml);
    previewMarked = marked;
  }
  const raw = await previewMarked.parse(source, { async: true });
  return sanitizeHtml(raw);
}

// Flattens inline tokens to plain text. Used for heading ids (no markup in the
// id) and TOC labels (reader-visible text, not source syntax).
//
// Parameter is `unknown` rather than marked's `Tokens.Generic[]` because
// Generic has a `[key:string]: any` index signature that pollutes downstream
// inference with any. Narrowing locally keeps the rest of the file type-safe.
export function plainTextFromTokens(tokens: unknown): string {
  if (!Array.isArray(tokens)) return "";
  let out = "";
  for (const t of tokens) {
    if (typeof t !== "object" || t === null) continue;
    const obj = t as Record<string, unknown>;
    if (Array.isArray(obj.tokens)) {
      out += plainTextFromTokens(obj.tokens);
      continue;
    }
    if (typeof obj.text === "string") out += obj.text;
  }
  return out;
}
