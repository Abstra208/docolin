ALTER TABLE "discussions" ADD COLUMN "pinned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "discussions" ADD COLUMN "answered_reply_id" uuid;--> statement-breakpoint
ALTER TABLE "discussions" ADD CONSTRAINT "discussions_answered_reply_id_discussion_replies_id_fk" FOREIGN KEY ("answered_reply_id") REFERENCES "public"."discussion_replies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discussions_doco_activity_idx" ON "discussions" USING btree ("doco_id","updated_at" DESC NULLS LAST);