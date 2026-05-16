import { error } from "@sveltejs/kit";
import { and, count, eq } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { db } from "$lib/server/db";
import { orgs, orgMembers, projects } from "$lib/server/db/schema";

// Loads a specific org by slug. Returns 404 (not 403) when the user isn't a
// member, to avoid leaking org existence to non-members.
export const load: PageServerLoad = async ({ locals, params }) => {
  const userId = locals.dbUser?.id;
  if (!userId) error(404);

  const orgRows = await db.select().from(orgs).where(eq(orgs.slug, params.org)).limit(1);
  if (orgRows.length === 0) error(404);
  const org = orgRows[0];

  const memberRows = await db
    .select({ userId: orgMembers.userId })
    .from(orgMembers)
    .where(and(eq(orgMembers.orgId, org.id), eq(orgMembers.userId, userId)))
    .limit(1);
  if (memberRows.length === 0) error(404);

  const memberCountRows = await db
    .select({ c: count() })
    .from(orgMembers)
    .where(eq(orgMembers.orgId, org.id));
  const memberCount = memberCountRows[0]?.c ?? 0;

  const orgProjects = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      displayName: projects.displayName,
      sourceMode: projects.sourceMode,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .where(eq(projects.ownerOrgId, org.id))
    .orderBy(projects.createdAt);

  return {
    org: {
      id: org.id,
      slug: org.slug,
      displayName: org.displayName,
      isPersonal: org.id === locals.personalOrg?.id,
      memberCount,
    },
    projects: orgProjects.map((p) => ({
      id: p.id,
      slug: p.slug,
      displayName: p.displayName,
      sourceMode: p.sourceMode,
      createdAt: p.createdAt.toISOString(),
    })),
  };
};
