import { json } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { RequestHandler } from "./$types";
import { db } from "$lib/server/db";
import { discussions, docos, orgs, projects } from "$lib/server/db/schema";
import { canModerateDiscussion } from "$lib/server/discussions";

// Per-user moderation capability for one thread. Split out from the (cached,
// public) thread page so the page HTML stays identical for every reader; the
// client fetches this only when signed in to decide whether to reveal the
// close / resolve / edit-any controls. Owner-of-a-post checks happen client-
// side by comparing handles, so they don't need the server.
export interface DiscussionCapabilities {
  canModerate: boolean;
}

export const GET: RequestHandler = async ({ params, locals, setHeaders }) => {
  setHeaders({ "cache-control": "private, no-store" });

  if (!locals.dbUser) return json({ canModerate: false } satisfies DiscussionCapabilities);

  const rows = await db
    .select({ adminUserId: orgs.adminUserId })
    .from(discussions)
    .innerJoin(docos, eq(docos.id, discussions.docoId))
    .innerJoin(projects, eq(projects.id, docos.projectId))
    .innerJoin(orgs, eq(orgs.id, projects.ownerOrgId))
    .where(eq(discussions.id, params.discussionId))
    .limit(1);
  if (rows.length === 0) return json({ canModerate: false } satisfies DiscussionCapabilities);

  const canModerate = canModerateDiscussion({
    user: { id: locals.dbUser.id, isPlatformAdmin: locals.dbUser.isPlatformAdmin },
    ownerOrgAdminUserId: rows[0].adminUserId,
  });
  return json({ canModerate } satisfies DiscussionCapabilities);
};
