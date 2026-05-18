import { baseLocale, locales } from "$paraglide/runtime";
import { SITE_URL } from "$lib/site";

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
