import { env } from "$lib/server/env";

// Cloudflare cache purge for doco latest URLs. After a sync publishes new
// versions, we tell CF to drop the cached HTML for every affected URL so the
// next reader hits a fresh function invocation. Versioned URLs (`...@{sha}`)
// are immutable and never purged.
//
// Setup: a CF API token scoped to `Zone.Cache Purge` on the zone serving
// docolin.com. Token + zone id come from env; both unset means we no-op with
// a warning so local dev / tests don't fail because of CF config.
//
// API: POST https://api.cloudflare.com/client/v4/zones/{zone}/purge_cache
// with `{ files: [...] }`. Max 30 URLs per call, so chunk if needed. Failures
// are logged but don't throw: a missed purge degrades to "edge serves stale
// for up to s-maxage", which the doco viewer's stale-while-revalidate window
// recovers from; throwing here would crash the sync handler after the DB has
// already committed.

// CF API caps each purge_cache call at 30 URLs.
const PURGE_CHUNK_SIZE = 30;

/** Purges the entire zone cache. Reserved for rare global invalidations (a
 *  renderer version change re-renders every doco, so per-URL purging would
 *  mean enumerating the whole site). Returns whether the purge succeeded so
 *  the caller can retry later; same no-op-without-config behavior as above. */
export async function purgeCacheEverything(): Promise<boolean> {
  const zoneId = env.CLOUDFLARE_ZONE_ID;
  const purgeToken = env.CLOUDFLARE_CACHE_PURGE_TOKEN;
  if (!zoneId || !purgeToken) {
    console.warn(
      "Cache purge-everything skipped: CLOUDFLARE_ZONE_ID / CLOUDFLARE_CACHE_PURGE_TOKEN unset.",
    );
    // Stay pending: a misconfigured production must keep retrying (and
    // logging) until the secrets exist, not silently mark the purge done.
    // Local dev doesn't run the cron, so the retry costs nothing there.
    return false;
  }
  // try-catch: fetch to an external API can always fail at the network layer;
  // the caller retries on the next cron tick.
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${purgeToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ purge_everything: true }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(
        `Cache purge-everything failed (status ${res.status.toString()}): ${body.slice(0, 500)}`,
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error("Cache purge-everything request threw", err);
    return false;
  }
}

export async function purgeCacheUrls(urls: string[]): Promise<void> {
  if (urls.length === 0) return;

  const zoneId = env.CLOUDFLARE_ZONE_ID;
  const purgeToken = env.CLOUDFLARE_CACHE_PURGE_TOKEN;
  if (!zoneId || !purgeToken) {
    console.warn(
      `Cache purge skipped: CLOUDFLARE_ZONE_ID / CLOUDFLARE_CACHE_PURGE_TOKEN unset. ${urls.length.toString()} URL(s) would have been purged.`,
    );
    return;
  }

  for (let i = 0; i < urls.length; i += PURGE_CHUNK_SIZE) {
    const chunk = urls.slice(i, i + PURGE_CHUNK_SIZE);
    try {
      const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${purgeToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ files: chunk }),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error(
          `Cache purge failed (status ${res.status.toString()}): ${body.slice(0, 500)}`,
        );
      }
    } catch (err) {
      console.error("Cache purge request threw", err);
    }
  }
}
