import { and, desc, eq, lt } from "drizzle-orm";
import { db } from "$lib/server/db";
import { stamps, versions, users } from "$lib/server/db/schema";
import { summarizeStamps } from "./recompute-core";

// Recomputes a guide version's cached verification aggregate from the stamps
// ledger and writes it back onto the version. Runs OFF the write path: call it
// via waitUntil after a stamp lands, or from the periodic recompute job, never
// inline in a read. Reads are served the cached columns.
export async function recomputeVersionScore(versionId: string): Promise<void> {
  const target = (
    await db
      .select({ docoId: versions.docoId, versionNumber: versions.versionNumber })
      .from(versions)
      .where(eq(versions.id, versionId))
      .limit(1)
  ).at(0);
  if (target === undefined) return;

  // The ranking estimate inherits the immediately-preceding version's decayed
  // estimate as its prior, so a fresh version keeps the lineage's standing
  // instead of dropping to zero (verification 4.8). A first version finds no
  // predecessor and falls back to the global prior.
  const previous = (
    await db
      .select({ rankingScore: versions.verificationRankingScore })
      .from(versions)
      .where(
        and(eq(versions.docoId, target.docoId), lt(versions.versionNumber, target.versionNumber)),
      )
      .orderBy(desc(versions.versionNumber))
      .limit(1)
  ).at(0);
  const previousRankingScore = previous?.rankingScore ?? null;

  const rows = await db
    .select({
      id: stamps.id,
      outcome: stamps.outcome,
      source: stamps.source,
      voterUserId: stamps.voterUserId,
      clusterId: stamps.clusterId,
      createdAt: stamps.createdAt,
      voterCreatedAt: users.createdAt,
    })
    .from(stamps)
    .leftJoin(users, eq(users.id, stamps.voterUserId))
    .where(eq(stamps.versionId, versionId));

  const summary = summarizeStamps(rows, new Date(), previousRankingScore);

  await db
    .update(versions)
    .set({
      verificationScore: summary.score,
      verificationRankingScore: summary.rankingScore,
      verificationStampCount: summary.stampCount,
      verificationLastConfirmedAt: summary.lastConfirmedAt,
      verificationComputedAt: new Date(),
    })
    .where(eq(versions.id, versionId));
}
