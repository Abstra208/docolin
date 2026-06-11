import {
  bundledLanguages,
  createHighlighter,
  createJavaScriptRegexEngine,
  type BundledLanguage,
  type Highlighter,
} from "shiki";
import type { Root as HastRoot } from "hast";
import { SHIKI_THEMES } from "$lib/markdown/render";

// The one shiki highlighter, shared by the server doco render and the client
// composer preview so both paths highlight identically.
//
// It runs shiki's JavaScript regex engine, not the default oniguruma WASM one:
// Cloudflare Workers forbid compiling WASM from bytes at runtime, so on the
// deployed Worker the WASM engine throws and every code block silently fell
// back to plain text (no colors, no line ids, no line select). The JS engine is
// pure compute, runs identically in workerd, Node, and the browser, and drops
// the wasm payload from the bundle. `forgiving` skips the rare grammar rule the
// regex translator cannot convert instead of throwing; a slightly imperfect
// highlight beats a plain block.

// Languages shiki supports without a grammar; never in bundledLanguages.
const PLAIN_LANGS = new Set(["text", "plain", "plaintext", "txt", "ansi"]);

// Lazy so importing this module stays cheap (Worker startup, client bundle
// graph); the highlighter core only loads on the first code block. Cached
// module-globally: it is pure compute, safe to share across Worker requests.
let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  highlighterPromise ??= createHighlighter({
    themes: Object.values(SHIKI_THEMES),
    langs: [],
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  });
  return highlighterPromise;
}

/** Highlights code to hast (dual-theme), loading the language grammar on first
 *  use. Unknown languages render as plain text rather than failing the block. */
export async function highlightCode(code: string, lang: string): Promise<HastRoot> {
  const highlighter = await getHighlighter();
  let resolved = lang;
  if (lang in bundledLanguages) {
    // No-op when the grammar is already registered, so per-block calls are cheap.
    await highlighter.loadLanguage(lang as BundledLanguage);
  } else if (!PLAIN_LANGS.has(lang)) {
    resolved = "text";
  }
  return highlighter.codeToHast(code, {
    lang: resolved,
    themes: SHIKI_THEMES,
    defaultColor: false,
  });
}
