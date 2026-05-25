import { eq } from "drizzle-orm";
import { db } from "$lib/server/db";
import { stamps } from "$lib/server/db/schema";
import type { StampOutcome } from "./score";
import type { StampSource } from "./weights";

// Records a stamp into the append-only ledger. This is the single entry point
// the web UI calls now and the MCP server calls later. Token validation and rate
// limiting happen at the endpoint/MCP layer before this is called; this just
// appends. After it returns, schedule recomputeVersionScore(versionId) off the
// write path (for example via the platform's waitUntil), never inline.

export interface RecordStampInput {
  versionId: string;
  outcome: StampOutcome;
  source: StampSource;
  /** The verifier, when signed in; null/omitted for anonymous stamps. */
  voterUserId?: string | null;
  /** Optional short note, mainly to explain a "worked with caveats". */
  note?: string | null;
  /** Coarse, salted network bucket for clustering; never a raw IP. */
  networkBucket?: string | null;
  /** Nonce of the one-time vote token redeemed (MCP / link verification). Null
   * for web stamps. The unique index over non-null nonces makes it single-use. */
  voteTokenNonce?: string | null;
}

// Returns the new stamp's id, or null when a vote-token nonce was supplied and
// had already been redeemed (ON CONFLICT DO NOTHING on the unique nonce index).
// Web stamps carry no nonce, so they never conflict and always return an id.
export async function recordStamp(input: RecordStampInput): Promise<{ stampId: string } | null> {
  const rows = await db
    .insert(stamps)
    .values({
      versionId: input.versionId,
      outcome: input.outcome,
      source: input.source,
      voterUserId: input.voterUserId ?? null,
      note: input.note ?? null,
      networkBucket: input.networkBucket ?? null,
      voteTokenNonce: input.voteTokenNonce ?? null,
    })
    .onConflictDoNothing()
    .returning({ id: stamps.id });
  return rows.length > 0 ? { stampId: rows[0].id } : null;
}

/** Whether a one-time vote-token nonce has already been redeemed, so the verify
 * page can show the spent state at load instead of only after a failed submit. */
export async function isVoteTokenRedeemed(nonce: string): Promise<boolean> {
  const rows = await db
    .select({ id: stamps.id })
    .from(stamps)
    .where(eq(stamps.voteTokenNonce, nonce))
    .limit(1);
  return rows.length > 0;
}
