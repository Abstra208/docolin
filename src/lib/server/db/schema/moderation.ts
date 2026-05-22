import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

// Moderation reason taxonomy. User-facing categories are exposed in the report
// picker; internal-only categories are used by user-support flows and admin actions.
// Kept here as the canonical list. See docs/moderation-policy.md for the public
// policy.
//
// USER-FACING:
//   csam, ncii, threat_violence, self_harm, doxxing, leaked_secret,
//   harassment, hate_speech, defamation, impersonation, nsfw_shock, spam,
//   dangerous_content, embargo_violation, copyright, other
//
// INTERNAL-ONLY (not in the user picker):
//   personal_data_self_erasure, compromised_account, court_order, author_request
//
// author_request is the reason a deletion request carries when the content's own
// author deletes it ("hide now, admins decide"). It is not a report reason and
// never appears in the user-facing picker.

const REASON_VALUES_SQL = sql.raw(
  "('csam', 'ncii', 'threat_violence', 'self_harm', 'doxxing', 'leaked_secret', " +
    "'harassment', 'hate_speech', 'defamation', 'impersonation', 'nsfw_shock', 'spam', " +
    "'dangerous_content', 'embargo_violation', 'copyright', 'other', " +
    "'personal_data_self_erasure', 'compromised_account', 'court_order', 'author_request')",
);

// Edit-history versions are moderatable targets in their own right: a leaked
// secret can sit in a prior body that the author already edited out of the live
// one, so it needs its own report / hide / redact path.
const TARGET_TYPE_VALUES_SQL = sql.raw(
  "('discussion', 'discussion_reply', 'version', 'discussion_edit', 'discussion_reply_edit')",
);

// User-filed reports. Many users can report the same target; each report is its
// own row. Mods and admins aggregate them in the queue UI.
export const reports = pgTable(
  "reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    targetType: text("target_type")
      .notNull()
      .$type<
        "discussion" | "discussion_reply" | "version" | "discussion_edit" | "discussion_reply_edit"
      >(),
    targetId: uuid("target_id").notNull(),
    reportedByUserId: uuid("reported_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    reason: text("reason").notNull(),
    details: text("details"),
    status: text("status")
      .notNull()
      .default("open")
      .$type<"open" | "dismissed" | "escalated_to_deletion" | "withdrawn">(),
    resolvedByUserId: uuid("resolved_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolutionNotes: text("resolution_notes"),
    // Incremented when a previously-dismissed report on the same target is re-filed.
    // Heavily weighted in admin priority sorting.
    dismissalThenReReportCount: integer("dismissal_then_re_report_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("reports_status_idx").on(t.status),
    index("reports_target_idx").on(t.targetType, t.targetId),
    index("reports_reported_by_idx").on(t.reportedByUserId),
    index("reports_created_at_idx").on(t.createdAt.desc()),
    check("reports_target_type_check", sql`${t.targetType} IN ${TARGET_TYPE_VALUES_SQL}`),
    check("reports_reason_check", sql`${t.reason} IN ${REASON_VALUES_SQL}`),
    check(
      "reports_status_check",
      sql`${t.status} IN ('open', 'dismissed', 'escalated_to_deletion', 'withdrawn')`,
    ),
  ],
);

// A request to hide content. Filing immediately hides the target with a
// "Deletion Pending" preview; admin then approves (hide stays) or denies (unhide).
// Distinct from a report because reports just flag for review.
export const deletionRequests = pgTable(
  "deletion_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    targetType: text("target_type")
      .notNull()
      .$type<
        "discussion" | "discussion_reply" | "version" | "discussion_edit" | "discussion_reply_edit"
      >(),
    targetId: uuid("target_id").notNull(),
    requestedByUserId: uuid("requested_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    reason: text("reason").notNull(),
    details: text("details"),
    status: text("status")
      .notNull()
      .default("pending")
      .$type<"pending" | "approved" | "denied" | "withdrawn">(),
    relatedReportId: uuid("related_report_id").references(() => reports.id, {
      onDelete: "set null",
    }),
    resolvedByUserId: uuid("resolved_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolutionNotes: text("resolution_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("deletion_requests_status_idx").on(t.status),
    index("deletion_requests_target_idx").on(t.targetType, t.targetId),
    index("deletion_requests_requested_by_idx").on(t.requestedByUserId),
    index("deletion_requests_created_at_idx").on(t.createdAt.desc()),
    check("deletion_requests_target_type_check", sql`${t.targetType} IN ${TARGET_TYPE_VALUES_SQL}`),
    check("deletion_requests_reason_check", sql`${t.reason} IN ${REASON_VALUES_SQL}`),
    check(
      "deletion_requests_status_check",
      sql`${t.status} IN ('pending', 'approved', 'denied', 'withdrawn')`,
    ),
  ],
);

// Append-only audit trail. Every mod and admin action writes one row. Powers
// admin stats (mod quality, user quality, action latency) and dispute review.
// Privacy redactions do NOT include the original content here.
export const moderationActions = pgTable(
  "moderation_actions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    actionType: text("action_type")
      .notNull()
      .$type<
        | "requested_deletion"
        | "approved_deletion"
        | "denied_deletion"
        | "hidden"
        | "unhidden"
        | "redacted"
        | "dismissed_report"
        | "escalated_to_deletion"
        | "hard_deleted"
      >(),
    targetType: text("target_type")
      .notNull()
      .$type<
        "discussion" | "discussion_reply" | "version" | "discussion_edit" | "discussion_reply_edit"
      >(),
    targetId: uuid("target_id").notNull(),
    relatedRequestId: uuid("related_request_id"),
    reason: text("reason"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("moderation_actions_actor_idx").on(t.actorUserId),
    index("moderation_actions_target_idx").on(t.targetType, t.targetId),
    index("moderation_actions_created_at_idx").on(t.createdAt.desc()),
    check(
      "moderation_actions_action_type_check",
      sql`${t.actionType} IN ('requested_deletion', 'approved_deletion', 'denied_deletion', 'hidden', 'unhidden', 'redacted', 'dismissed_report', 'escalated_to_deletion', 'hard_deleted')`,
    ),
    check(
      "moderation_actions_target_type_check",
      sql`${t.targetType} IN ${TARGET_TYPE_VALUES_SQL}`,
    ),
  ],
);
