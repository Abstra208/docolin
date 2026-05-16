import { sql } from "drizzle-orm";
import { boolean, check, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { docos, versions } from "./docos";
import { users } from "./users";

// Discussions and replies carry hide / redact state directly. `hidden_*` columns
// describe a non-destructive hide (visible to admins + author only). `redacted_*`
// columns describe a destructive privacy redaction (original body replaced; no
// recovery path). `hidden_until` supports embargo-style hides that auto-reverse.
export const discussions = pgTable(
  "discussions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    docoId: uuid("doco_id")
      .notNull()
      .references(() => docos.id, { onDelete: "cascade" }),
    versionId: uuid("version_id").references(() => versions.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    bodyText: text("body_text").notNull(),
    bodyFormat: text("body_format").notNull().default("commonmark").$type<"commonmark">(),
    status: text("status").notNull().default("open").$type<"open" | "closed" | "resolved">(),
    hiddenAt: timestamp("hidden_at", { withTimezone: true }),
    hiddenByUserId: uuid("hidden_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    hiddenReason: text("hidden_reason"),
    hiddenUntil: timestamp("hidden_until", { withTimezone: true }),
    isRedacted: boolean("is_redacted").notNull().default(false),
    redactedAt: timestamp("redacted_at", { withTimezone: true }),
    redactedByUserId: uuid("redacted_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    redactedReason: text("redacted_reason"),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("discussions_doco_idx").on(t.docoId),
    index("discussions_status_idx").on(t.status),
    index("discussions_created_by_idx").on(t.createdByUserId),
    index("discussions_hidden_idx").on(t.hiddenAt),
    check("discussions_status_check", sql`${t.status} IN ('open', 'closed', 'resolved')`),
  ],
);

// Flat reply list (no nested threading). Add a parent column later if community asks.
export const discussionReplies = pgTable(
  "discussion_replies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    discussionId: uuid("discussion_id")
      .notNull()
      .references(() => discussions.id, { onDelete: "cascade" }),
    bodyText: text("body_text").notNull(),
    bodyFormat: text("body_format").notNull().default("commonmark").$type<"commonmark">(),
    hiddenAt: timestamp("hidden_at", { withTimezone: true }),
    hiddenByUserId: uuid("hidden_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    hiddenReason: text("hidden_reason"),
    hiddenUntil: timestamp("hidden_until", { withTimezone: true }),
    isRedacted: boolean("is_redacted").notNull().default(false),
    redactedAt: timestamp("redacted_at", { withTimezone: true }),
    redactedByUserId: uuid("redacted_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    redactedReason: text("redacted_reason"),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("discussion_replies_discussion_idx").on(t.discussionId),
    index("discussion_replies_created_at_idx").on(t.createdAt),
    index("discussion_replies_hidden_idx").on(t.hiddenAt),
  ],
);

// Author edit history. Original body is preserved here every time the author edits;
// the current body lives on the discussion / reply row.
export const discussionEdits = pgTable(
  "discussion_edits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    discussionId: uuid("discussion_id")
      .notNull()
      .references(() => discussions.id, { onDelete: "cascade" }),
    priorBodyText: text("prior_body_text").notNull(),
    priorBodyFormat: text("prior_body_format").notNull(),
    editedByUserId: uuid("edited_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    editedAt: timestamp("edited_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("discussion_edits_discussion_idx").on(t.discussionId)],
);

export const discussionReplyEdits = pgTable(
  "discussion_reply_edits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    discussionReplyId: uuid("discussion_reply_id")
      .notNull()
      .references(() => discussionReplies.id, { onDelete: "cascade" }),
    priorBodyText: text("prior_body_text").notNull(),
    priorBodyFormat: text("prior_body_format").notNull(),
    editedByUserId: uuid("edited_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    editedAt: timestamp("edited_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("discussion_reply_edits_reply_idx").on(t.discussionReplyId)],
);
