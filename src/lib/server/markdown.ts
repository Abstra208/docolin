import { codeToHast } from "shiki";
import {
  createMarkdownRenderer,
  extractToc,
  RENDERER_VERSION,
  SHIKI_THEMES,
  type TocEntry,
} from "$lib/markdown/render";

// Server markdown renderer. Builds the docomd remark/rehype pipeline (see
// $lib/markdown/render) with a statically imported shiki highlighter; the client
// composer preview builds the same pipeline but lazy-imports shiki. So the
// published doco and the preview render identically.
//
// Source of truth (markdown) lives in the DB; rendered HTML is computed on read
// in load functions and cached at the edge. Bumping RENDERER_VERSION (in the
// render module) invalidates every cached page on the next read.
//
// Used by every server surface that displays user-authored text (inbox, docos,
// versions, discussions). Keep this the only server path that produces HTML so
// upgrades stay one-line and consistent everywhere.

export { RENDERER_VERSION };
export type { TocEntry };

const render = createMarkdownRenderer((code, lang) =>
  codeToHast(code, { lang, themes: SHIKI_THEMES, defaultColor: false }),
);

export function renderMarkdown(source: string): Promise<string> {
  return render(source);
}

/** Top-level h2/h3 headings for the doco viewer's table of contents. */
export const extractDocoToc = extractToc;

// Average adult silent reading speed for technical prose, the same number every
// other "min read" estimator on the internet uses. Lower bound, so a 1-word page
// rounds up to 1 minute (a "0 min read" badge reads as broken).
const WPM = 200;

/** Estimated reading minutes for a doco body, derived from the word count.
 *  Whitespace-token split is good enough; the rendered HTML reorders words but
 *  doesn't add or remove enough of them to move the rounded result. Always
 *  returns at least 1, so even a stub doco shows a sensible value. */
export function extractReadingMinutes(source: string): number {
  let words = 0;
  let inWord = false;
  for (const c of source) {
    const isSpace = c === " " || c === "\t" || c === "\n" || c === "\r";
    if (isSpace) {
      inWord = false;
    } else if (!inWord) {
      inWord = true;
      words += 1;
    }
  }
  return Math.max(1, Math.round(words / WPM));
}
