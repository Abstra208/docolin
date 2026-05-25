ALTER TABLE "search_logs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP MATERIALIZED VIEW "public"."latest_versions";--> statement-breakpoint
DROP TABLE "search_logs" CASCADE;--> statement-breakpoint
ALTER TABLE "versions" ALTER COLUMN "embedding" SET DATA TYPE vector(1024);--> statement-breakpoint
ALTER TABLE "versions" ADD COLUMN "verification_ranking_score" integer;--> statement-breakpoint
ALTER TABLE "versions" ADD COLUMN "is_latest" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "versions" ADD COLUMN "search_tsv" "tsvector" GENERATED ALWAYS AS (docolin_search_tsv(language, title, aliases, description, applies_to, body_text)) STORED;--> statement-breakpoint
CREATE INDEX "versions_search_tsv_gin" ON "versions" USING gin ("search_tsv") WHERE "versions"."is_latest" = true;--> statement-breakpoint
CREATE INDEX "versions_embedding_hnsw" ON "versions" USING hnsw ("embedding" vector_cosine_ops) WITH (m=16,ef_construction=200) WHERE "versions"."is_latest" = true;--> statement-breakpoint
CREATE INDEX "versions_applies_to_gin" ON "versions" USING gin ("applies_to") WHERE "versions"."is_latest" = true;--> statement-breakpoint
CREATE MATERIALIZED VIEW "public"."latest_versions" AS (
    SELECT
      d.id AS doco_id,
      v.id AS version_id,
      v.version_number,
      v.kind,
      v.type,
      v.title,
      v.description,
      v.applies_to,
      v.status,
      v.language,
      v.difficulty,
      v.time_estimate_min_minutes,
      v.time_estimate_max_minutes,
      v.aliases,
      v.prev_link,
      v.next_link,
      v.superseded_by,
      v.references,
      v.authors,
      v.sitemap,
      v.body_text,
      v.body_format,
      v.verification_score,
      v.verification_ranking_score,
      v.verification_stamp_count,
      v.verification_last_confirmed_at,
      v.embedding,
      v.published_at
    FROM docos d
    INNER JOIN versions v ON v.id = d.latest_published_version_id
  );