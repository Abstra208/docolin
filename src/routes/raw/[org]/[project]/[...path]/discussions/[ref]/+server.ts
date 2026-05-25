import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getDiscussionMarkdown } from "$lib/server/doco-content";

// Raw markdown for a discussion thread (original post + flat replies) under a
// doco, so agents can read community Q&A / fixes the same way they read a guide.
// Reader-independent; cached briefly since threads change as replies come in.

const CACHE = "public, max-age=0, s-maxage=120, stale-while-revalidate=600";

export const GET: RequestHandler = async ({ params, setHeaders }) => {
  const markdown = await getDiscussionMarkdown(params.org, params.project, params.path, params.ref);
  if (markdown === null) error(404);

  setHeaders({ "content-type": "text/markdown; charset=utf-8", "cache-control": CACHE });
  return new Response(markdown);
};
