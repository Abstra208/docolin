import { baseLocale, locales } from "$paraglide/runtime";
import { SITE_URL } from "$lib/site";
import { slugify } from "$lib/slug";

// Shared mapping between a doco's `path_in_source` (filesystem path inside the
// git repo) and its public URL `path-from-project-root`. The viewer needs the
// inverse direction; the sync engine's cache-purge needs the forward direction.
// One module, one set of rules, so the two never drift out of sync.

// Strip leading + trailing slashes from a subpath. Treat null / empty the
// same: no subpath in effect.
function normalizeSubpath(subpath: string | null): string {
  if (subpath === null || subpath.length === 0) return "";
  let s = subpath;
  if (s.endsWith("/")) s = s.slice(0, -1);
  return s;
}

// `docs/intro.md` (with subpath "docs") → `intro`
// `guides/install.md` (no subpath)      → `guides/install`
// `README.md` (no subpath)              → `README`
export function pathFromSourcePath(pathInSource: string, subpath: string | null): string {
  const sub = normalizeSubpath(subpath);
  let out = pathInSource;
  if (sub.length > 0 && out.startsWith(`${sub}/`)) {
    out = out.slice(sub.length + 1);
  }
  if (out.toLowerCase().endsWith(".md")) {
    out = out.slice(0, -3);
  }
  return out;
}

// Inverse direction. `intro` (subpath "docs") → `docs/intro.md`.
export function rebuildPathInSource(urlPath: string, subpath: string | null): string {
  const sub = normalizeSubpath(subpath);
  const base = sub.length > 0 ? `${sub}/${urlPath}` : urlPath;
  return `${base}.md`;
}

// Public URLs for one doco across every locale paraglide is configured for.
// Used by the cache purger so a content change invalidates every localized
// variant of the latest URL. Versioned URLs (`...@{sha}`) are immutable and
// never need purging.
export function publicLatestUrls(args: {
  orgSlug: string;
  projectSlug: string;
  pathFromProjectRoot: string;
}): string[] {
  const urls: string[] = [];
  for (const loc of locales) {
    const prefix = loc === baseLocale ? "" : `/${loc}`;
    urls.push(
      `${SITE_URL}${prefix}/${args.orgSlug}/${args.projectSlug}/${args.pathFromProjectRoot}`,
    );
  }
  return urls;
}

// Canonical URL ref for a discussion: "{number}-{title-slug}", or just the
// number when the title has no sluggable characters. The number is what the
// route resolves on; the slug is SEO sugar (regenerated from the title, stale
// slugs 301 to this canonical form).
export function discussionRef(number: number, title: string): string {
  const slug = slugify(title);
  return slug.length > 0 ? `${String(number)}-${slug}` : String(number);
}

// Parses the leading integer of a discussion URL ref ("12-some-slug" -> 12).
// Returns null when there's no leading positive integer. No regex (CLAUDE.md 3.8).
export function parseDiscussionNumber(ref: string): number | null {
  let digits = "";
  for (const c of ref) {
    if (c >= "0" && c <= "9") digits += c;
    else break;
  }
  if (digits.length === 0) return null;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Public discussion URLs across every locale, for cache purging after a
// discussion write. `ref` omitted purges the per-doco thread list; supplied
// (the canonical "{number}-{slug}") purges the single thread page. The
// discussion routes are cached like the doco viewer (public, mutable), so
// writes purge them on the same best-effort basis as a sync.
export function discussionUrls(args: {
  orgSlug: string;
  projectSlug: string;
  pathFromProjectRoot: string;
  ref?: string;
}): string[] {
  const base = `${args.orgSlug}/${args.projectSlug}/${args.pathFromProjectRoot}/discussions`;
  const suffix = args.ref === undefined ? "" : `/${args.ref}`;
  const urls: string[] = [];
  for (const loc of locales) {
    const prefix = loc === baseLocale ? "" : `/${loc}`;
    urls.push(`${SITE_URL}${prefix}/${base}${suffix}`);
  }
  return urls;
}
