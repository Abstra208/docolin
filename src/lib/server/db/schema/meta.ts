import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Tiny key-value store for platform-level state that has no natural home in a
// domain table. Current keys:
//   renderer_version: the RENDERER_VERSION the edge cache was last purged for
//     (see $lib/server/renderer-purge). Lets a deploy with a renderer change
//     invalidate every cached rendered page exactly once.
export const meta = pgTable("meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
