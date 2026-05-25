import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getDocoContent, buildDocoMarkdown } from "$lib/server/doco-content";

// Raw markdown for a doco. `/raw/{org}/{project}/{path}` serves the latest
// version's body + an attribution footer as text/markdown; `@{sha-or-number}`
// pins a version. Reader-independent and edge-cacheable: latest revalidates,
// a pinned version is immutable. Backs the MCP fetch tool and direct curl/agent
// access.

const CACHE_LATEST = "public, max-age=0, s-maxage=300, stale-while-revalidate=86400";
const CACHE_VERSIONED = "public, max-age=31536000, immutable";

export const GET: RequestHandler = async ({ params, url, setHeaders }) => {
  const content = await getDocoContent(params.org, params.project, params.path);
  if (content === null) error(404);

  setHeaders({
    "content-type": "text/markdown; charset=utf-8",
    "cache-control": content.isLatestRequest ? CACHE_LATEST : CACHE_VERSIONED,
  });
  return new Response(buildDocoMarkdown(content, url.origin));
};
