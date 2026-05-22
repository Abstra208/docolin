import { and, count, eq, inArray } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { db } from "$lib/server/db";
import { deletionRequests, reports } from "$lib/server/db/schema";
import { URGENT_REASONS } from "$lib/moderation-reasons";

// Counts for the hub's Moderation card, so urgent work is visible without
// opening the queue. The admin +layout.server.ts already gates + sets no-store.
export const load: PageServerLoad = async () => {
  const [urgent, pending] = await Promise.all([
    db
      .select({ c: count() })
      .from(reports)
      .where(and(eq(reports.status, "open"), inArray(reports.reason, URGENT_REASONS))),
    db.select({ c: count() }).from(deletionRequests).where(eq(deletionRequests.status, "pending")),
  ]);
  return {
    urgentReports: urgent[0]?.c ?? 0,
    pendingDeletions: pending[0]?.c ?? 0,
  };
};
