import { and, eq, ne } from "drizzle-orm";
import { db } from "$lib/server/db";
import { claimRequests, inboxMessages, orgs, orgMembers } from "$lib/server/db/schema";
import type { DbOrg } from "./users";

// Admin actions on pre-reserved-name claims. Both run as a single transaction
// so a partial state (e.g. org created but claim status not updated) can't
// happen. The cascade-cancel on approve enforces the schema's "one approval
// per slug" rule and queues claim_cancelled inbox messages for the rejected
// claimants so they know what happened next time the inbox UI ships.

export type ApproveClaimResult =
  | { ok: true; org: DbOrg; cancelledCount: number }
  | { ok: false; reason: "not_found" | "not_pending" | "slug_taken" | "provision_failed" };

export async function approveClaim({
  uid,
  adminUserId,
  notes,
}: {
  uid: string;
  adminUserId: string;
  notes: string | null;
}): Promise<ApproveClaimResult> {
  try {
    return await db.transaction(async (tx) => {
      const claimRows = await tx
        .select()
        .from(claimRequests)
        .where(eq(claimRequests.uid, uid))
        .limit(1);
      if (claimRows.length === 0) return { ok: false, reason: "not_found" } as const;
      const claim = claimRows[0];
      if (claim.status !== "pending") return { ok: false, reason: "not_pending" } as const;

      const takenRows = await tx
        .select({ id: orgs.id })
        .from(orgs)
        .where(eq(orgs.slug, claim.requestedSlug))
        .limit(1);
      if (takenRows.length > 0) return { ok: false, reason: "slug_taken" } as const;

      const insertedRows = await tx
        .insert(orgs)
        .values({
          slug: claim.requestedSlug,
          displayName: claim.requestedDisplayName,
          adminUserId: claim.requestedByUserId,
          foundedByUserId: claim.requestedByUserId,
        })
        .returning();
      const insertedOrg = insertedRows[0];

      await tx.insert(orgMembers).values({
        orgId: insertedOrg.id,
        userId: claim.requestedByUserId,
      });

      const now = new Date();

      await tx
        .update(claimRequests)
        .set({
          status: "approved",
          resolvedByUserId: adminUserId,
          resolvedAt: now,
          resolutionNotes: notes,
          updatedAt: now,
        })
        .where(eq(claimRequests.id, claim.id));

      const cancelled = await tx
        .update(claimRequests)
        .set({
          status: "cancelled",
          resolvedByUserId: adminUserId,
          resolvedAt: now,
          resolutionNotes: "Slug was approved for another claimant.",
          updatedAt: now,
        })
        .where(
          and(
            eq(claimRequests.requestedSlug, claim.requestedSlug),
            eq(claimRequests.status, "pending"),
            ne(claimRequests.id, claim.id),
          ),
        )
        .returning({
          id: claimRequests.id,
          userId: claimRequests.requestedByUserId,
        });

      await tx.insert(inboxMessages).values({
        userId: claim.requestedByUserId,
        kind: "claim_approved",
        bodyMarkdown: `Your claim for **${claim.requestedSlug}** was approved. The org is live at [/dashboard/${claim.requestedSlug}](/dashboard/${claim.requestedSlug}).`,
        linkUrl: `/dashboard/${claim.requestedSlug}`,
        relatedRecordId: claim.id,
      });

      if (cancelled.length > 0) {
        await tx.insert(inboxMessages).values(
          cancelled.map((sib) => ({
            userId: sib.userId,
            kind: "claim_cancelled" as const,
            bodyMarkdown: `Your claim for **${claim.requestedSlug}** was cancelled because another claimant was verified for this slug.`,
            relatedRecordId: sib.id,
          })),
        );
      }

      return {
        ok: true as const,
        org: insertedOrg,
        cancelledCount: cancelled.length,
      };
    });
  } catch (err) {
    console.error("approveClaim failed", err);
    return { ok: false, reason: "provision_failed" };
  }
}

export type CancelClaimResult = { ok: true } | { ok: false; reason: "not_found" | "not_pending" };

export async function cancelClaim({
  uid,
  adminUserId,
  notes,
}: {
  uid: string;
  adminUserId: string;
  notes: string;
}): Promise<CancelClaimResult> {
  return db.transaction(async (tx) => {
    const claimRows = await tx
      .select()
      .from(claimRequests)
      .where(eq(claimRequests.uid, uid))
      .limit(1);
    if (claimRows.length === 0) return { ok: false, reason: "not_found" } as const;
    const claim = claimRows[0];
    if (claim.status !== "pending") return { ok: false, reason: "not_pending" } as const;

    const now = new Date();

    await tx
      .update(claimRequests)
      .set({
        status: "cancelled",
        resolvedByUserId: adminUserId,
        resolvedAt: now,
        resolutionNotes: notes,
        updatedAt: now,
      })
      .where(eq(claimRequests.id, claim.id));

    await tx.insert(inboxMessages).values({
      userId: claim.requestedByUserId,
      kind: "claim_cancelled",
      bodyMarkdown: `Your claim for **${claim.requestedSlug}** was declined.\n\n${notes}`,
      relatedRecordId: claim.id,
    });

    return { ok: true as const };
  });
}
