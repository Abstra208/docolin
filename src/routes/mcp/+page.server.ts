import type { PageServerLoad } from "./$types";

// Public MCP landing. No per-user content; the only dynamic value is the
// endpoint URL, derived from the request origin and identical for every reader
// on a given host, so it stays edge-cacheable like the marketing home. CF Pages
// purges on deploy, so the long s-maxage rebuilds on the first post-deploy hit.
export const load: PageServerLoad = ({ url, setHeaders, isDataRequest }) => {
  setHeaders({
    "cache-control": isDataRequest
      ? "private, no-store"
      : "public, max-age=300, s-maxage=2592000, stale-while-revalidate=604800",
  });
  return { endpoint: `${url.origin}/api/mcp` };
};
