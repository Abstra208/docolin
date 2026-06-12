import { fail } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "$lib/server/db";
import { docos, versions, projects, orgs, gitSources } from "$lib/server/db/schema";
import { verifyVoteToken } from "$lib/server/mcp/vote-token";
import { recordStamp, isVoteTokenRedeemed } from "$lib/verification/ingest";
import { stampNetworkBucket } from "$lib/server/stamp-bucket";
import { pathFromSourcePath } from "$lib/doco-urls";
import type { StampOutcome } from "$lib/verification/score";

// Human redemption of a one-time vote token (the verifyUrl an agent can surface).
// The reader confirms how the doco went on their system; signed to their account
// if logged in, anonymous otherwise. Per-token + session-dependent, so no-store.

interface VersionDisplay {
  title: string;
  appliesTo: string[];
  orgSlug: string;
  projectSlug: string;
  pathInSource: string | null;
  subpath: string | null;
}

async function versionDisplay(versionId: string): Promise<VersionDisplay | null> {
  const rows = await db
    .select({
      title: versions.title,
      appliesTo: versions.appliesTo,
      orgSlug: orgs.slug,
      projectSlug: projects.slug,
      pathInSource: docos.pathInSource,
      subpath: gitSources.subpath,
    })
    .from(versions)
    .innerJoin(docos, eq(docos.id, versions.docoId))
    .innerJoin(projects, eq(projects.id, docos.projectId))
    .innerJoin(orgs, eq(orgs.id, projects.ownerOrgId))
    .leftJoin(gitSources, eq(gitSources.id, docos.gitSourceId))
    .where(eq(versions.id, versionId))
    .limit(1);
  return rows.at(0) ?? null;
}

export const load: PageServerLoad = async ({ params, locals, setHeaders }) => {
  setHeaders({ "cache-control": "private, no-store" });
  const claims = await verifyVoteToken(params.token);
  if (claims === null) return { valid: false as const };
  const v = await versionDisplay(claims.versionId);
  if (v === null) return { valid: false as const };
  return {
    valid: true as const,
    // Spent links show the redeemed state on load, not only after a failed POST.
    alreadyVerified: await isVoteTokenRedeemed(claims.nonce),
    title: v.title,
    docoUrl: `/${v.orgSlug}/${v.projectSlug}/${pathFromSourcePath(v.pathInSource ?? "", v.subpath)}`,
    appliesTo: v.appliesTo,
    signedIn: locals.dbUser !== null,
  };
};

const OUTCOMES = new Set<string>(["worked", "worked_with_caveats", "didnt_work"]);

export const actions: Actions = {
  default: async ({ request, params, locals, getClientAddress }) => {
    const claims = await verifyVoteToken(params.token);
    if (claims === null) return fail(400, { error: "invalid" });
    const form = await request.formData();
    const outcome = form.get("outcome");
    if (typeof outcome !== "string" || !OUTCOMES.has(outcome))
      return fail(400, { error: "outcome" });

    const voter = locals.dbUser ?? null;
    const result = await recordStamp({
      versionId: claims.versionId,
      outcome: outcome as StampOutcome,
      source: voter ? "human" : "anonymous",
      voterUserId: voter ? voter.id : null,
      networkBucket: await stampNetworkBucket(getClientAddress()),
      voteTokenNonce: claims.nonce,
    });
    // null => this token was already redeemed. Recompute is debounced by the
    // recompute-scores cron, same as the on-page verification.
    return { recorded: result !== null, signed: voter !== null };
  },
};
