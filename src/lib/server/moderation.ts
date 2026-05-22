import { and, count, eq } from "drizzle-orm";
import {
  REPORT_REASONS,
  type ModerationTargetType,
  type ReportReason,
} from "$lib/moderation-reasons";
import { db } from "$lib/server/db";
import {
  deletionRequests,
  discussionEdits,
  discussionReplies,
  discussionReplyEdits,
  discussions,
  docos,
  inboxMessages,
  moderationActions,
  orgs,
  projects,
  reports,
  versions,
} from "$lib/server/db/schema";

// Submission layer for moderation: filing reports and deletion requests against
// any moderatable target. The review side (admin queue, approve / deny / hide /
// redact) lives in moderation-review.ts. Inbox bodies are stored as plain text
// at write time (the recipient's locale isn't known then), matching the
// existing notification convention in $lib/server/discussions.

// Re-exported from the client-safe module so server callers keep importing the
// target-type from here while dialogs import it from $lib/moderation-reasons.
export type { ModerationTargetType };

// Reasons that route straight to platform staff (time-sensitive or legal).
// The rest are doco-moderator business. Reports against a doco / version always
// route to admins regardless of reason (per the moderation design).
const ADMIN_ROUTED_REASONS = new Set<ReportReason>([
  "csam",
  "ncii",
  "threat_violence",
  "self_harm",
  "doxxing",
  "leaked_secret",
  "defamation",
  "impersonation",
  "embargo_violation",
  "copyright",
]);

export function reportRoutesToAdmin(
  reason: ReportReason,
  targetType: ModerationTargetType,
): boolean {
  if (targetType === "version") return true;
  return ADMIN_ROUTED_REASONS.has(reason);
}

function isReportReason(value: string): value is ReportReason {
  return (REPORT_REASONS as readonly string[]).includes(value);
}

// Drizzle transaction handle, derived from db.transaction's callback so the
// hide helpers can run inside the same transaction as the request insert.
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Versions have no hide columns and the viewer's version resolution isn't
// hide-aware yet, so version takedown rendering is deferred. A version deletion
// request is still recorded for the admin queue, it just doesn't auto-hide.
function isHideableTarget(targetType: ModerationTargetType): boolean {
  return targetType !== "version";
}

export interface ResolvedTarget {
  docoId: string;
  // The content's author (null for version rows synced without a creator).
  authorUserId: string | null;
}

// Resolves a target to the doco it belongs to (for moderator scoping) and its
// author (for notifications + author-vs-moderator permission). Returns null for
// a missing target. Versions are never hideable but still resolve.
export async function resolveTarget(
  targetType: ModerationTargetType,
  targetId: string,
): Promise<ResolvedTarget | null> {
  switch (targetType) {
    case "discussion": {
      const r = await db
        .select({ docoId: discussions.docoId, author: discussions.createdByUserId })
        .from(discussions)
        .where(eq(discussions.id, targetId))
        .limit(1);
      return r[0] ? { docoId: r[0].docoId, authorUserId: r[0].author } : null;
    }
    case "discussion_reply": {
      const r = await db
        .select({ docoId: discussions.docoId, author: discussionReplies.createdByUserId })
        .from(discussionReplies)
        .innerJoin(discussions, eq(discussions.id, discussionReplies.discussionId))
        .where(eq(discussionReplies.id, targetId))
        .limit(1);
      return r[0] ? { docoId: r[0].docoId, authorUserId: r[0].author } : null;
    }
    case "version": {
      const r = await db
        .select({ docoId: versions.docoId, author: versions.createdByUserId })
        .from(versions)
        .where(eq(versions.id, targetId))
        .limit(1);
      return r[0] ? { docoId: r[0].docoId, authorUserId: r[0].author } : null;
    }
    case "discussion_edit": {
      const r = await db
        .select({ docoId: discussions.docoId, author: discussionEdits.editedByUserId })
        .from(discussionEdits)
        .innerJoin(discussions, eq(discussions.id, discussionEdits.discussionId))
        .where(eq(discussionEdits.id, targetId))
        .limit(1);
      return r[0] ? { docoId: r[0].docoId, authorUserId: r[0].author } : null;
    }
    case "discussion_reply_edit": {
      const r = await db
        .select({ docoId: discussions.docoId, author: discussionReplyEdits.editedByUserId })
        .from(discussionReplyEdits)
        .innerJoin(
          discussionReplies,
          eq(discussionReplies.id, discussionReplyEdits.discussionReplyId),
        )
        .innerJoin(discussions, eq(discussions.id, discussionReplies.discussionId))
        .where(eq(discussionReplyEdits.id, targetId))
        .limit(1);
      return r[0] ? { docoId: r[0].docoId, authorUserId: r[0].author } : null;
    }
  }
}

// The user who can moderate a doco at the org level (platform admins are
// handled separately by the caller). Currently the owning org's admin; org-role
// permissions are a later extension point.
export async function getDocoOwnerOrgAdminUserId(docoId: string): Promise<string | null> {
  const r = await db
    .select({ adminUserId: orgs.adminUserId })
    .from(docos)
    .innerJoin(projects, eq(projects.id, docos.projectId))
    .innerJoin(orgs, eq(orgs.id, projects.ownerOrgId))
    .where(eq(docos.id, docoId))
    .limit(1);
  return r[0]?.adminUserId ?? null;
}

// Marks a target hidden from public reads. No-op for versions. Used by the
// deletion-request flow and by direct admin hides (moderation-review.ts).
export async function hideContent(
  tx: Tx,
  targetType: ModerationTargetType,
  targetId: string,
  byUserId: string,
  reason: string,
): Promise<void> {
  const values = { hiddenAt: new Date(), hiddenByUserId: byUserId, hiddenReason: reason };
  switch (targetType) {
    case "discussion":
      await tx.update(discussions).set(values).where(eq(discussions.id, targetId));
      return;
    case "discussion_reply":
      await tx.update(discussionReplies).set(values).where(eq(discussionReplies.id, targetId));
      return;
    case "discussion_edit":
      await tx.update(discussionEdits).set(values).where(eq(discussionEdits.id, targetId));
      return;
    case "discussion_reply_edit":
      await tx
        .update(discussionReplyEdits)
        .set(values)
        .where(eq(discussionReplyEdits.id, targetId));
      return;
    case "version":
      return;
  }
}

// Reverses a hide (deny a deletion request, admin unhide). Clears the embargo
// window too. No-op for versions.
export async function unhideContent(
  tx: Tx,
  targetType: ModerationTargetType,
  targetId: string,
): Promise<void> {
  const values = {
    hiddenAt: null,
    hiddenByUserId: null,
    hiddenReason: null,
    hiddenUntil: null,
  };
  switch (targetType) {
    case "discussion":
      await tx.update(discussions).set(values).where(eq(discussions.id, targetId));
      return;
    case "discussion_reply":
      await tx.update(discussionReplies).set(values).where(eq(discussionReplies.id, targetId));
      return;
    case "discussion_edit":
      await tx.update(discussionEdits).set(values).where(eq(discussionEdits.id, targetId));
      return;
    case "discussion_reply_edit":
      await tx
        .update(discussionReplyEdits)
        .set(values)
        .where(eq(discussionReplyEdits.id, targetId));
      return;
    case "version":
      return;
  }
}

// Privacy redaction: the admin edits the body in place to scrub the offending
// part (a leaked secret, someone's private data) while preserving as much of the
// content as possible. `newBody` replaces the original, which is destroyed; the
// redacted version stays publicly visible. Irreversible (the original is gone).
// Clears any prior hide so the redacted content is visible. No-op for versions.
export async function redactContent(
  tx: Tx,
  targetType: ModerationTargetType,
  targetId: string,
  byUserId: string,
  reason: string,
  newBody: string,
): Promise<void> {
  const redactState = {
    isRedacted: true,
    redactedAt: new Date(),
    redactedByUserId: byUserId,
    redactedReason: reason,
    hiddenAt: null,
    hiddenByUserId: null,
    hiddenReason: null,
    hiddenUntil: null,
  };
  switch (targetType) {
    case "discussion":
      await tx
        .update(discussions)
        .set({ bodyText: newBody, ...redactState })
        .where(eq(discussions.id, targetId));
      return;
    case "discussion_reply":
      await tx
        .update(discussionReplies)
        .set({ bodyText: newBody, ...redactState })
        .where(eq(discussionReplies.id, targetId));
      return;
    case "discussion_edit":
      await tx
        .update(discussionEdits)
        .set({ priorBodyText: newBody, ...redactState })
        .where(eq(discussionEdits.id, targetId));
      return;
    case "discussion_reply_edit":
      await tx
        .update(discussionReplyEdits)
        .set({ priorBodyText: newBody, ...redactState })
        .where(eq(discussionReplyEdits.id, targetId));
      return;
    case "version":
      return;
  }
}

// Builds an inbox markdown body with an optional "open it" button.
function notificationBody(text: string, targetUrl: string | undefined): string {
  if (targetUrl === undefined) return text;
  return `${text}

:::btn
[Open it](${targetUrl})
:::`;
}

export type ReportResult = { ok: true } | { ok: false; reason: "not_found" | "invalid_reason" };

// Files a report. Logged-in callers only (enforced at the action). Records the
// number of prior dismissed reports on the same target (a volume signal for the
// admin queue's priority sort) and notifies the author once per open-report
// cycle, without ever revealing who reported them.
export async function submitReport(args: {
  targetType: ModerationTargetType;
  targetId: string;
  reportedByUserId: string;
  reason: string;
  details: string;
  targetUrl?: string;
}): Promise<ReportResult> {
  if (!isReportReason(args.reason)) return { ok: false, reason: "invalid_reason" };
  const target = await resolveTarget(args.targetType, args.targetId);
  if (target === null) return { ok: false, reason: "not_found" };

  const targetMatch = and(
    eq(reports.targetType, args.targetType),
    eq(reports.targetId, args.targetId),
  );
  const dismissed = await db
    .select({ c: count() })
    .from(reports)
    .where(and(targetMatch, eq(reports.status, "dismissed")));
  const openExisting = await db
    .select({ id: reports.id })
    .from(reports)
    .where(and(targetMatch, eq(reports.status, "open")))
    .limit(1);

  await db.insert(reports).values({
    targetType: args.targetType,
    targetId: args.targetId,
    reportedByUserId: args.reportedByUserId,
    reason: args.reason,
    details: args.details.length > 0 ? args.details : null,
    dismissalThenReReportCount: dismissed[0]?.c ?? 0,
  });

  if (
    openExisting.length === 0 &&
    target.authorUserId !== null &&
    target.authorUserId !== args.reportedByUserId
  ) {
    await db.insert(inboxMessages).values({
      userId: target.authorUserId,
      kind: "report_filed_against_you",
      subject: "Your content was reported",
      preview: "It's under review. We never share who reported content.",
      bodyMarkdown: notificationBody(
        "Some of your content was reported and is now under review. We don't share who reported it or the specific reason while the review is open. If we take any action, you'll hear from us here.",
        args.targetUrl,
      ),
      linkUrl: args.targetUrl ?? null,
      relatedRecordId: args.targetId,
    });
  }

  return { ok: true };
}

export type DeletionRequestResult =
  | { ok: true; hidden: boolean; wasDiscussion: boolean }
  | { ok: false; reason: "not_found" | "forbidden" | "invalid_reason" };

// Files a deletion request. Two callers converge here:
//   - the content's author deleting their own (reason "author_request")
//   - a moderator requesting deletion of someone's content (a taxonomy reason)
// Filing immediately hides the target (except versions) and records the action.
// Returns wasDiscussion so the caller can redirect away from a now-hidden thread
// when its original post was the target.
export async function fileDeletionRequest(args: {
  targetType: ModerationTargetType;
  targetId: string;
  reason: string;
  details: string;
  user: { id: string; isPlatformAdmin: boolean };
  targetUrl?: string;
}): Promise<DeletionRequestResult> {
  const target = await resolveTarget(args.targetType, args.targetId);
  if (target === null) return { ok: false, reason: "not_found" };

  const ownerAdmin = await getDocoOwnerOrgAdminUserId(target.docoId);
  const isAuthor = target.authorUserId !== null && target.authorUserId === args.user.id;
  const canModerate =
    args.user.isPlatformAdmin || (ownerAdmin !== null && ownerAdmin === args.user.id);

  if (args.reason === "author_request") {
    if (!isAuthor) return { ok: false, reason: "forbidden" };
  } else if (!isReportReason(args.reason)) {
    return { ok: false, reason: "invalid_reason" };
  } else if (!canModerate) {
    return { ok: false, reason: "forbidden" };
  }

  const hidden = isHideableTarget(args.targetType);
  const notifyAuthor =
    hidden && target.authorUserId !== null && target.authorUserId !== args.user.id;

  await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(deletionRequests)
      .values({
        targetType: args.targetType,
        targetId: args.targetId,
        requestedByUserId: args.user.id,
        reason: args.reason,
        details: args.details.length > 0 ? args.details : null,
      })
      .returning({ id: deletionRequests.id });
    const requestId = inserted[0].id;

    if (hidden) await hideContent(tx, args.targetType, args.targetId, args.user.id, args.reason);

    await tx.insert(moderationActions).values({
      actorUserId: args.user.id,
      actionType: "requested_deletion",
      targetType: args.targetType,
      targetId: args.targetId,
      relatedRequestId: requestId,
      reason: args.reason,
    });

    if (notifyAuthor && target.authorUserId !== null) {
      await tx.insert(inboxMessages).values({
        userId: target.authorUserId,
        kind: "content_hidden",
        subject: "Your content was hidden pending review",
        preview: "A moderator requested its removal. Platform staff will review.",
        bodyMarkdown: notificationBody(
          "A moderator requested the removal of some of your content, so it has been hidden while platform staff review the request. If the request is denied, your content will become visible again.",
          args.targetUrl,
        ),
        linkUrl: args.targetUrl ?? null,
        relatedRecordId: args.targetId,
      });
    }
  });

  return { ok: true, hidden, wasDiscussion: args.targetType === "discussion" };
}
