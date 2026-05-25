import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "$lib/server/db";
import { mcpTokens } from "$lib/server/db/schema";

// Personal MCP access tokens (PATs). Minted in the dashboard, presented by the
// MCP client as a Bearer token. Only the SHA-256 hash is stored; the plaintext
// is returned once at creation and never again. The MCP endpoint resolves a
// presented token to its owner, which is what makes an agent's verification
// signed to an account (and gates future write tools).

const TOKEN_PREFIX = "doco_mcp_";
// Shown in the dashboard so the owner can tell tokens apart without the secret.
const PREFIX_DISPLAY_LENGTH = TOKEN_PREFIX.length + 6;

function randomSecret(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const body = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  return `${TOKEN_PREFIX}${body}`;
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface CreatedMcpToken {
  id: string;
  /** Plaintext token, shown to the user exactly once. */
  token: string;
}

export async function createMcpToken(userId: string, name: string): Promise<CreatedMcpToken> {
  const token = randomSecret();
  const tokenHash = await sha256Hex(token);
  const rows = await db
    .insert(mcpTokens)
    .values({ userId, name, tokenHash, tokenPrefix: token.slice(0, PREFIX_DISPLAY_LENGTH) })
    .returning({ id: mcpTokens.id });
  return { id: rows[0].id, token };
}

export interface McpTokenInfo {
  id: string;
  name: string;
  tokenPrefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export async function listMcpTokens(userId: string): Promise<McpTokenInfo[]> {
  return db
    .select({
      id: mcpTokens.id,
      name: mcpTokens.name,
      tokenPrefix: mcpTokens.tokenPrefix,
      createdAt: mcpTokens.createdAt,
      lastUsedAt: mcpTokens.lastUsedAt,
    })
    .from(mcpTokens)
    .where(and(eq(mcpTokens.userId, userId), isNull(mcpTokens.revokedAt)))
    .orderBy(desc(mcpTokens.createdAt));
}

/** Soft-revokes a token the user owns (scoped by userId so one user can't revoke
 * another's). */
export async function revokeMcpToken(userId: string, id: string): Promise<void> {
  await db
    .update(mcpTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(mcpTokens.id, id), eq(mcpTokens.userId, userId), isNull(mcpTokens.revokedAt)));
}

/** Resolves a raw Bearer header to the owning user id, or null. Bumps lastUsedAt
 * (best-effort) so the dashboard can show activity. */
export async function resolveMcpToken(authorization: string | null): Promise<string | null> {
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  if (!token.startsWith(TOKEN_PREFIX)) return null;

  const tokenHash = await sha256Hex(token);
  const rows = await db
    .select({ id: mcpTokens.id, userId: mcpTokens.userId })
    .from(mcpTokens)
    .where(and(eq(mcpTokens.tokenHash, tokenHash), isNull(mcpTokens.revokedAt)))
    .limit(1);
  if (rows.length === 0) return null;

  await db.update(mcpTokens).set({ lastUsedAt: new Date() }).where(eq(mcpTokens.id, rows[0].id));
  return rows[0].userId;
}
