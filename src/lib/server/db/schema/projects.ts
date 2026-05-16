import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { orgs } from "./orgs";

// A project is the publishing unit owned by an org. Each project has exactly
// one source (git-backed or docolin-native) and contains docos. Hard URLs
// take the shape `/{org}/{project}/{path}`.
//
// The source is attached via `git_sources.project_id` (1:1 enforced by a
// unique index on that side). source_mode lives here so consumers can ask
// "is this git or native?" without joining git_sources.
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerOrgId: uuid("owner_org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    displayName: text("display_name"),
    sourceMode: text("source_mode").notNull().$type<"git" | "native">(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    // Composite uniqueness: two orgs can each have a project named `docs`.
    uniqueIndex("projects_org_slug_unique").on(t.ownerOrgId, t.slug),
    index("projects_owner_org_idx").on(t.ownerOrgId),
    check("projects_source_mode_check", sql`${t.sourceMode} IN ('git', 'native')`),
  ],
);
