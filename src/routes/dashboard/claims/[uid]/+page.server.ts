import { error } from "@sveltejs/kit";
import { and, eq } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { db } from "$lib/server/db";
import { claimRequests } from "$lib/server/db/schema";

// Confirmation view for a claim the current user filed. Looked up by UID +
// requestedByUserId so users can only see their own claims (privacy + leak
// prevention).
export const load: PageServerLoad = async ({ locals, params }) => {
  const userId = locals.dbUser?.id;
  if (!userId) error(404);

  const rows = await db
    .select({
      uid: claimRequests.uid,
      requestedSlug: claimRequests.requestedSlug,
      status: claimRequests.status,
      details: claimRequests.details,
      createdAt: claimRequests.createdAt,
    })
    .from(claimRequests)
    .where(and(eq(claimRequests.uid, params.uid), eq(claimRequests.requestedByUserId, userId)))
    .limit(1);

  if (rows.length === 0) error(404);
  const claim = rows[0];

  return {
    claim: {
      uid: claim.uid,
      slug: claim.requestedSlug,
      status: claim.status,
      details: claim.details,
      createdAt: claim.createdAt.toISOString(),
    },
  };
};
