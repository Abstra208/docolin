-- Custom migration (drizzle-kit generate --custom): the differ cannot express
-- a materialized-view -> plain-view conversion. latest_versions was created as
-- a materialized view whose refresh was never wired (search queries `versions`
-- directly), so it served whatever existed at creation time: a stale snapshot
-- on dev, nothing in production. As a plain view it is always fresh; every
-- consumer is edge-cached, so the join cost lands on cache misses only.
DROP MATERIALIZED VIEW "public"."latest_versions";--> statement-breakpoint
CREATE VIEW "public"."latest_versions" AS (
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
