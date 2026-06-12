import { randomUUID } from "node:crypto";
import { and, count, eq, ne } from "drizzle-orm";
import { db } from "$lib/server/db";
import { inboxMessages, mcpTokens, orgMembers, orgs, projects, users } from "$lib/server/db/schema";
import { requireEnv } from "$lib/server/env";

// Account self-service: display name and deletion.
//
// Deletion semantics (the privacy-first / content-is-public compromise):
//   - The user row is tombstoned, not deleted: authored content references it
//     with `restrict` FKs and threads must stay coherent. Every PII column is
//     scrubbed (handle -> deleted-{hex}, display name, email, WorkOS id).
//   - Public contributions (discussions, replies, stamps) stay, under the
//     ghost identity. The UI says so and points at the per-post deletion
//     request flow for content someone wants gone before they leave.
//   - Private data IS deleted: inbox, personal MCP tokens, org memberships,
//     the personal org row, and the WorkOS user.
//   - Blockers, not cascades: admin of a non-personal org, or projects in the
//     personal org, must be handled deliberately first.

export interface AccountView {
  handle: string;
  displayName: string | null;
  email: string | null;
  /** Non-personal orgs this user admins; deletion is blocked until they are
   *  transferred or deleted. */
  blockingOrgSlugs: string[];
  /** Projects still in the personal org; deletion is blocked until removed. */
  personalProjectCount: number;
}

export async function getAccountView(userId: string): Promise<AccountView | null> {
  const userRows = await db
    .select({
      handle: users.handle,
      displayName: users.displayName,
      email: users.email,
      personalOrgId: users.personalOrgId,
    })
    .from(users)
    .where(eq(users.id, userId));
  if (userRows.length === 0) return null;
  const user = userRows[0];

  const adminOrgRows = await db
    .select({ id: orgs.id, slug: orgs.slug })
    .from(orgs)
    .where(
      user.personalOrgId === null
        ? eq(orgs.adminUserId, userId)
        : and(eq(orgs.adminUserId, userId), ne(orgs.id, user.personalOrgId)),
    );
  const personalProjects =
    user.personalOrgId === null
      ? 0
      : ((
          await db
            .select({ n: count() })
            .from(projects)
            .where(eq(projects.ownerOrgId, user.personalOrgId))
        )[0]?.n ?? 0);

  return {
    handle: user.handle,
    displayName: user.displayName,
    email: user.email,
    blockingOrgSlugs: adminOrgRows.map((o) => o.slug),
    personalProjectCount: personalProjects,
  };
}

export async function updateDisplayName(userId: string, displayName: string | null): Promise<void> {
  await db.update(users).set({ displayName, updatedAt: new Date() }).where(eq(users.id, userId));
}

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; reason: "blocked" | "workos_failed" | "not_found" };

/** Tombstones the account. WorkOS deletion runs first and aborts on failure
 *  (retryable, nothing changed locally); the local scrub is one transaction. */
export async function deleteAccount(userId: string): Promise<DeleteAccountResult> {
  const view = await getAccountView(userId);
  if (view === null) return { ok: false, reason: "not_found" };
  if (view.blockingOrgSlugs.length > 0 || view.personalProjectCount > 0) {
    return { ok: false, reason: "blocked" };
  }

  const userRows = await db
    .select({ workosUserId: users.workosUserId, personalOrgId: users.personalOrgId })
    .from(users)
    .where(eq(users.id, userId));
  if (userRows.length === 0) return { ok: false, reason: "not_found" };
  const { workosUserId, personalOrgId } = userRows[0];

  // WorkOS first: if this fails nothing changed locally and the user can
  // retry. The reverse order would leave scrubbed local rows pointing at a
  // live WorkOS identity whose deletion could never be retried (the link is
  // gone), keeping PII at WorkOS forever.
  // try-catch: external API call; network failure or timeout must become a
  // retryable error, not a crash.
  try {
    const res = await fetch(`https://api.workos.com/user_management/users/${workosUserId}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${requireEnv("WORKOS_API_KEY")}` },
      // A hung upstream must not pin the request handler open.
      signal: AbortSignal.timeout(10_000),
    });
    // 404 means the WorkOS side is already gone; that's fine for our goal.
    if (!res.ok && res.status !== 404) {
      console.error(`WorkOS user deletion failed (status ${res.status.toString()})`);
      return { ok: false, reason: "workos_failed" };
    }
  } catch (err) {
    console.error("WorkOS user deletion request threw", err);
    return { ok: false, reason: "workos_failed" };
  }

  const tombstoneTag = randomUUID();
  const outcome = await db.transaction(async (tx): Promise<"done" | "raced"> => {
    // Re-check the blockers inside the transaction: a project or org created
    // between the pre-check and here must abort the scrub, or the personal-org
    // delete below would cascade it away. The WorkOS side is already gone at
    // this point (rare, loud, and recoverable: the data survives), the
    // reverse ordering would lose PII deletion instead, see above.
    const [adminOrgRows, personalProjects] = await Promise.all([
      tx
        .select({ id: orgs.id })
        .from(orgs)
        .where(
          personalOrgId === null
            ? eq(orgs.adminUserId, userId)
            : and(eq(orgs.adminUserId, userId), ne(orgs.id, personalOrgId)),
        ),
      personalOrgId === null
        ? Promise.resolve([])
        : tx
            .select({ id: projects.id })
            .from(projects)
            .where(eq(projects.ownerOrgId, personalOrgId)),
    ]);
    if (adminOrgRows.length > 0 || personalProjects.length > 0) return "raced";
    // Private data goes for real.
    await tx.delete(inboxMessages).where(eq(inboxMessages.userId, userId));
    await tx.delete(mcpTokens).where(eq(mcpTokens.userId, userId));
    await tx.delete(orgMembers).where(eq(orgMembers.userId, userId));
    // The personal org dies with the account (re-checked empty just above).
    // users.personal_org_id is ON DELETE SET NULL.
    if (personalOrgId !== null) await tx.delete(orgs).where(eq(orgs.id, personalOrgId));
    // Tombstone: scrubbed but referencable. The unique columns get tagged
    // values so re-registration of the freed handle/email works.
    await tx
      .update(users)
      .set({
        handle: `deleted-${tombstoneTag.slice(0, 8)}`,
        displayName: null,
        email: null,
        workosUserId: `deleted_${tombstoneTag}`,
        isPlatformAdmin: false,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
    return "done";
  });
  if (outcome === "raced") {
    console.error(
      `Account deletion aborted mid-flight for user ${userId}: blockers appeared after the WorkOS user was already deleted. Local data preserved; needs manual follow-up.`,
    );
    return { ok: false, reason: "blocked" };
  }
  return { ok: true };
}
