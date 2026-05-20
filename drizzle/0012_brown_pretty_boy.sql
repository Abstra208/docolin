ALTER TABLE "docos" ADD COLUMN "discussion_seq" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "discussions" ADD COLUMN "number" integer;--> statement-breakpoint
UPDATE "discussions" AS d SET "number" = n.rn FROM (
	SELECT "id", row_number() OVER (PARTITION BY "doco_id" ORDER BY "created_at", "id") AS rn
	FROM "discussions"
) AS n WHERE d."id" = n."id";--> statement-breakpoint
UPDATE "docos" AS dc SET "discussion_seq" = sub.maxn FROM (
	SELECT "doco_id", MAX("number") AS maxn FROM "discussions" GROUP BY "doco_id"
) AS sub WHERE dc."id" = sub."doco_id";--> statement-breakpoint
ALTER TABLE "discussions" ALTER COLUMN "number" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "discussions_doco_number_unique" ON "discussions" USING btree ("doco_id","number");