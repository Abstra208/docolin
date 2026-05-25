import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getDiscussionListMarkdown } from "$lib/server/doco-content";
import type { ThreadFilter } from "$lib/server/discussions";

// Raw markdown index of a doco's discussions. `?status=open|closed` filters;
// default is the full list. Reader-independent; short edge TTL since the list
// changes as threads are opened / replied to.

const CACHE = "public, max-age=0, s-maxage=120, stale-while-revalidate=600";

export const GET: RequestHandler = async ({ params, url, setHeaders }) => {
  const statusParam = url.searchParams.get("status");
  const filter: ThreadFilter =
    statusParam === "open" || statusParam === "closed" ? statusParam : "all";

  const markdown = await getDiscussionListMarkdown(params.org, params.project, params.path, filter);
  if (markdown === null) error(404);

  setHeaders({ "content-type": "text/markdown; charset=utf-8", "cache-control": CACHE });
  return new Response(markdown);
};
