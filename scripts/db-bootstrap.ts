// DB prerequisites that Drizzle migrations can't express, run BEFORE db:migrate
// on a fresh database (and after pulling a change to this file). Idempotent.
//
//   bun scripts/db-bootstrap.ts && bun run db:migrate && bun scripts/backfill-is-latest.ts
//
// docolin_search_tsv is the immutable function the versions.search_tsv generated
// column calls. It lives here, not inline in the column, because folding the
// text[] fields (array_to_string) is not immutable enough for a generated column
// or index expression; wrapping the logic in an IMMUTABLE function is the
// standard workaround. English is the one stemmed language (the primary content
// language); everything else uses the language-neutral `simple` config, with the
// bge-m3 dense vector carrying cross-language recall. Weights: title + aliases =
// A, description = B, applies_to = C, body = D. This is the single source of
// truth for the function; CREATE OR REPLACE keeps the DB in sync on re-run.
import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Add it to .env or your shell environment.");
}

const pool = new Pool({ connectionString: databaseUrl });

await pool.query(`
  CREATE OR REPLACE FUNCTION docolin_search_tsv(
    language text, title text, aliases text[], description text, applies_to text[], body_text text
  ) RETURNS tsvector LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE
      WHEN language = 'en' THEN
           setweight(to_tsvector('english', coalesce(title, '')), 'A')
        || setweight(to_tsvector('english', coalesce(array_to_string(aliases, ' '), '')), 'A')
        || setweight(to_tsvector('english', coalesce(description, '')), 'B')
        || setweight(to_tsvector('english', coalesce(array_to_string(applies_to, ' '), '')), 'C')
        || setweight(to_tsvector('english', coalesce(body_text, '')), 'D')
      ELSE
           setweight(to_tsvector('simple', coalesce(title, '')), 'A')
        || setweight(to_tsvector('simple', coalesce(array_to_string(aliases, ' '), '')), 'A')
        || setweight(to_tsvector('simple', coalesce(description, '')), 'B')
        || setweight(to_tsvector('simple', coalesce(array_to_string(applies_to, ' '), '')), 'C')
        || setweight(to_tsvector('simple', coalesce(body_text, '')), 'D')
    END
  $$;
`);

console.log("db bootstrap: docolin_search_tsv function ensured");
await pool.end();
