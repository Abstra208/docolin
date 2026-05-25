// Cron worker. CF fires `scheduled()` on the schedule declared in wrangler.toml;
// this handler just calls the docolin app's /api/cron/* endpoints with the
// shared secret. All logic lives in the main app, keeping the worker dumb means
// we don't duplicate code or have two places to update when a job changes. Jobs
// run in parallel and independently: one failing doesn't block the others.

import type { ScheduledEvent, ExecutionContext } from "@cloudflare/workers-types";

interface Env {
  DOCOLIN_BASE_URL: string;
  CRON_SECRET: string;
}

// The cron jobs fired each tick. sync pulls fresh content; recompute-scores
// refreshes Pango scores from the stamps ledger; embed-versions fills in the
// dense search vectors for newly latest versions.
const CRON_PATHS = ["/api/cron/sync", "/api/cron/recompute-scores", "/api/cron/embed-versions"];

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(Promise.allSettled(CRON_PATHS.map((path) => triggerCron(env, path))));
  },
};

async function triggerCron(env: Env, path: string): Promise<void> {
  const url = `${env.DOCOLIN_BASE_URL}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CRON_SECRET}`,
      },
    });
  } catch (err) {
    console.error(
      `cron: fetch ${url} threw: ${err instanceof Error ? err.message : "unknown error"}`,
    );
    return;
  }

  if (!res.ok) {
    const body = await safeText(res);
    console.error(`cron: ${url} returned ${String(res.status)} ${res.statusText}: ${body}`);
    return;
  }

  const body = await safeText(res);
  console.log(`cron: ${url} OK: ${body}`);
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "<no body>";
  }
}
