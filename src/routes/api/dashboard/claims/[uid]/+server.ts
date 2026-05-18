import { error, json } from "@sveltejs/kit";
import { and, eq } from "drizzle-orm";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/db";
import { claimRequests } from "$lib/server/db/schema";

// Per-user claim detail. Filtered by requestedByUserId so a user can only
// see their own claims, never another user's; this is privacy + leak
// prevention (a missing claim 404s the same as someone else's claim).
//
// Also surfaces the requester's displayName so the page's mailto template
// can pre-fill the signature line. Pulled from `locals.dbUser` since the
// page itself is a session-independent shell and can't read it.
export const GET: RequestHandler = async ({ locals, params, setHeaders }) => {
  const userId = locals.dbUser?.id;
  if (!userId) error(401, "not_authenticated");

  setHeaders({ "cache-control": "private, no-store" });

  const rows = await db
    .select({
      uid: claimRequests.uid,
      requestedSlug: claimRequests.requestedSlug,
      requestedDisplayName: claimRequests.requestedDisplayName,
      status: claimRequests.status,
      details: claimRequests.details,
      createdAt: claimRequests.createdAt,
    })
    .from(claimRequests)
    .where(and(eq(claimRequests.uid, params.uid), eq(claimRequests.requestedByUserId, userId)))
    .limit(1);
  if (rows.length === 0) error(404);
  const claim = rows[0];

  return json({
    claim: {
      uid: claim.uid,
      slug: claim.requestedSlug,
      displayName: claim.requestedDisplayName,
      status: claim.status,
      details: claim.details,
      createdAt: claim.createdAt.toISOString(),
    },
    requesterDisplayName: locals.dbUser?.displayName ?? null,
  });
};
