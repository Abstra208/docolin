// Dev helper: POST a cron endpoint on a running local server with the shared
// secret, so you don't have to remember the curl. Wired up as `bun run cron:*`.
//
//   bun run cron:sync        -> /api/cron/sync
//   bun run cron:recompute   -> /api/cron/recompute-scores
//   bun run cron:embed       -> /api/cron/embed-versions
//   bun run cron:all         -> all three in order
//
// Reads CRON_SECRET from .env (the same value the dev server authenticates
// against) and targets http://localhost:5173 unless DOCOLIN_BASE_URL is set.
//
// Note: embed-versions needs the Workers AI binding, so it only works against
// `wrangler dev` or a deployment, not plain `vite dev` (it 500s without it).
// sync and recompute-scores run fine against `vite dev`.
import "dotenv/config";

const VALID_JOBS = ["sync", "recompute-scores", "embed-versions"] as const;
type Job = (typeof VALID_JOBS)[number];

const arg = process.argv[2];
if (!VALID_JOBS.includes(arg as Job)) {
  console.error(`usage: bun scripts/cron-dev.ts <${VALID_JOBS.join(" | ")}>`);
  process.exit(1);
}
const job = arg as Job;

const baseUrl = process.env.DOCOLIN_BASE_URL ?? "http://localhost:5173";
const secret = process.env.CRON_SECRET;
if (!secret) {
  throw new Error("CRON_SECRET is not set. Add it to .env (the dev server reads the same value).");
}

const url = `${baseUrl}/api/cron/${job}`;
console.log(`POST ${url}`);

const res = await fetch(url, {
  method: "POST",
  headers: { Authorization: `Bearer ${secret}` },
});
const body = await res.text();
console.log(`${String(res.status)} ${res.statusText}`);
console.log(body);
if (!res.ok) process.exit(1);
