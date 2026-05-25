import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";

// Personal MCP access tokens (PATs). A user mints one in the dashboard and pastes
// it into their MCP client as a Bearer token; the MCP endpoint resolves it to the
// user for signed verification, higher rate limits, and future write tools. Only
// the hash is stored, the plaintext (doco_mcp_...) is shown once at creation.
export const mcpTokens = pgTable(
  "mcp_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // SHA-256 hash of the token; the plaintext is never stored.
    tokenHash: text("token_hash").notNull().unique(),
    // Leading chars for display ("doco_mcp_AbCd..."), so the owner can tell tokens
    // apart in the dashboard without revealing the secret.
    tokenPrefix: text("token_prefix").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    // Soft revocation: a revoked token stays for the audit trail but never resolves.
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [index("mcp_tokens_user_idx").on(t.userId)],
);
