CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_org_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"display_name" text,
	"source_mode" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_source_mode_check" CHECK ("projects"."source_mode" IN ('git', 'native'))
);
--> statement-breakpoint
ALTER TABLE "git_sources" DROP CONSTRAINT "git_sources_one_owner_check";--> statement-breakpoint
ALTER TABLE "git_sources" DROP CONSTRAINT "git_sources_owner_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "git_sources" DROP CONSTRAINT "git_sources_owner_org_id_orgs_id_fk";
--> statement-breakpoint
ALTER TABLE "docos" DROP CONSTRAINT "docos_owner_org_id_orgs_id_fk";
--> statement-breakpoint
DROP INDEX "git_sources_owner_user_idx";--> statement-breakpoint
DROP INDEX "git_sources_owner_org_idx";--> statement-breakpoint
DROP INDEX "docos_owner_org_idx";--> statement-breakpoint
ALTER TABLE "git_sources" ADD COLUMN "project_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "docos" ADD COLUMN "project_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_org_id_orgs_id_fk" FOREIGN KEY ("owner_org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "projects_org_slug_unique" ON "projects" USING btree ("owner_org_id","slug");--> statement-breakpoint
CREATE INDEX "projects_owner_org_idx" ON "projects" USING btree ("owner_org_id");--> statement-breakpoint
ALTER TABLE "git_sources" ADD CONSTRAINT "git_sources_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "docos" ADD CONSTRAINT "docos_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "git_sources_project_unique" ON "git_sources" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "docos_project_idx" ON "docos" USING btree ("project_id");--> statement-breakpoint
ALTER TABLE "git_sources" DROP COLUMN "owner_user_id";--> statement-breakpoint
ALTER TABLE "git_sources" DROP COLUMN "owner_org_id";--> statement-breakpoint
ALTER TABLE "docos" DROP COLUMN "owner_org_id";