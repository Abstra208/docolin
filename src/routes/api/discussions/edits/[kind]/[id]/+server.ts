import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getDiscussionEditHistory, getReplyEditHistory } from "$lib/server/discussions";

// Public edit history for a post (the "edited" dropdown). Public per the
// moderation policy; loaded on demand (a reader opens the history) rather than
// baked into every thread payload. Cacheable at the edge since it changes only
// when the post is edited.
const CACHE = "public, max-age=0, s-maxage=300, stale-while-revalidate=86400";

export const GET: RequestHandler = async ({ params, setHeaders }) => {
  setHeaders({ "cache-control": CACHE });

  const versions =
    params.kind === "discussion"
      ? await getDiscussionEditHistory(params.id)
      : params.kind === "reply"
        ? await getReplyEditHistory(params.id)
        : null;
  if (versions === null) error(404);

  return json({ versions });
};
