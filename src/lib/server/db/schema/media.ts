import { sql } from "drizzle-orm";
import { boolean, bigint, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

// Uploaded media (images, attachments). Content-addressed via sha256 hash.
// `committed` flips true when first referenced from a saved comment / discussion /
// version body. Background job deletes uncommitted uploads older than the TTL
// to prevent the platform being abused as free file hosting.
export const mediaUploads = pgTable(
  "media_uploads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    uploaderUserId: uuid("uploader_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contentHash: text("content_hash").notNull().unique(),
    url: text("url").notNull(),
    mimeType: text("mime_type"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
    committed: boolean("committed").notNull().default(false),
    lastReferencedAt: timestamp("last_referenced_at", { withTimezone: true }),
  },
  (t) => [
    index("media_uploads_uploader_idx").on(t.uploaderUserId),
    index("media_uploads_uncommitted_idx")
      .on(t.uploadedAt)
      .where(sql`${t.committed} = false`),
  ],
);
