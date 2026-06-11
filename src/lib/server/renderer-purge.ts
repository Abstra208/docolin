import { eq } from "drizzle-orm";
import { db } from "$lib/server/db";
import { meta } from "$lib/server/db/schema";
import { RENDERER_VERSION } from "$lib/markdown/render";
import { purgeCacheEverything } from "$lib/sync/cache-purge";

// Makes a RENDERER_VERSION bump actually invalidate the edge cache. Rendered
// doco HTML is cached at the edge for up to a day (plus a week of SWR), so a
// renderer change would otherwise keep serving old markup long after deploy.
//
// Called from the sync cron tick (the most frequent scheduled entry point):
// one indexed read per tick, and after a deploy with a new version, one
// purge-everything. Purge first, record after, so a failed purge retries on
// the next tick instead of being lost.

const META_KEY = "renderer_version";

/** Purges the whole zone cache once after a deploy changed RENDERER_VERSION.
 *  No-op (one SELECT) on every other tick. */
export async function purgeOnRendererChange(): Promise<void> {
  const rows = await db.select({ value: meta.value }).from(meta).where(eq(meta.key, META_KEY));
  const stored = rows.length > 0 ? rows[0].value : null;
  if (stored === RENDERER_VERSION) return;

  const purged = await purgeCacheEverything();
  if (!purged) return;

  await db
    .insert(meta)
    .values({ key: META_KEY, value: RENDERER_VERSION, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: meta.key,
      set: { value: RENDERER_VERSION, updatedAt: new Date() },
    });
  console.log(
    `Renderer version changed (${stored ?? "unset"} -> ${RENDERER_VERSION}); purged the zone cache.`,
  );
}
