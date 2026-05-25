// One-time backfill of versions.is_latest. The sync path maintains the flag
// going forward (set alongside docos.latest_published_version_id), but content
// that predates the column needs this pass, otherwise the partial search
// indexes (WHERE is_latest) would cover zero rows. Idempotent: it recomputes
// the flag for every version from each doco's current latest pointer, so it is
// safe to re-run.
//
// Run after the migration that adds the column:  bun scripts/backfill-is-latest.ts
import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Add it to .env or your shell environment.");
}

const pool = new Pool({ connectionString: databaseUrl });

// IS NOT DISTINCT FROM keeps the NOT NULL column valid even when a doco has no
// latest pointer (null vs a real id is "distinct", so the row gets false).
const result = await pool.query(
  `UPDATE versions v
      SET is_latest = (d.latest_published_version_id IS NOT DISTINCT FROM v.id)
     FROM docos d
    WHERE d.id = v.doco_id`,
);

console.log(`is_latest backfilled: ${result.rowCount ?? 0} version rows updated`);
await pool.end();
