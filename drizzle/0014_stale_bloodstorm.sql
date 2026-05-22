ALTER TABLE "deletion_requests" DROP CONSTRAINT "deletion_requests_target_type_check";--> statement-breakpoint
ALTER TABLE "deletion_requests" DROP CONSTRAINT "deletion_requests_reason_check";--> statement-breakpoint
ALTER TABLE "moderation_actions" DROP CONSTRAINT "moderation_actions_target_type_check";--> statement-breakpoint
ALTER TABLE "reports" DROP CONSTRAINT "reports_target_type_check";--> statement-breakpoint
ALTER TABLE "reports" DROP CONSTRAINT "reports_reason_check";--> statement-breakpoint
ALTER TABLE "discussion_edits" ADD COLUMN "hidden_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "discussion_edits" ADD COLUMN "hidden_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "discussion_edits" ADD COLUMN "hidden_reason" text;--> statement-breakpoint
ALTER TABLE "discussion_edits" ADD COLUMN "hidden_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "discussion_edits" ADD COLUMN "is_redacted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "discussion_edits" ADD COLUMN "redacted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "discussion_edits" ADD COLUMN "redacted_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "discussion_edits" ADD COLUMN "redacted_reason" text;--> statement-breakpoint
ALTER TABLE "discussion_reply_edits" ADD COLUMN "hidden_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "discussion_reply_edits" ADD COLUMN "hidden_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "discussion_reply_edits" ADD COLUMN "hidden_reason" text;--> statement-breakpoint
ALTER TABLE "discussion_reply_edits" ADD COLUMN "hidden_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "discussion_reply_edits" ADD COLUMN "is_redacted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "discussion_reply_edits" ADD COLUMN "redacted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "discussion_reply_edits" ADD COLUMN "redacted_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "discussion_reply_edits" ADD COLUMN "redacted_reason" text;--> statement-breakpoint
ALTER TABLE "discussion_edits" ADD CONSTRAINT "discussion_edits_hidden_by_user_id_users_id_fk" FOREIGN KEY ("hidden_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_edits" ADD CONSTRAINT "discussion_edits_redacted_by_user_id_users_id_fk" FOREIGN KEY ("redacted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_reply_edits" ADD CONSTRAINT "discussion_reply_edits_hidden_by_user_id_users_id_fk" FOREIGN KEY ("hidden_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_reply_edits" ADD CONSTRAINT "discussion_reply_edits_redacted_by_user_id_users_id_fk" FOREIGN KEY ("redacted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discussion_edits_hidden_idx" ON "discussion_edits" USING btree ("hidden_at");--> statement-breakpoint
CREATE INDEX "discussion_reply_edits_hidden_idx" ON "discussion_reply_edits" USING btree ("hidden_at");--> statement-breakpoint
ALTER TABLE "deletion_requests" ADD CONSTRAINT "deletion_requests_target_type_check" CHECK ("deletion_requests"."target_type" IN ('discussion', 'discussion_reply', 'version', 'discussion_edit', 'discussion_reply_edit'));--> statement-breakpoint
ALTER TABLE "deletion_requests" ADD CONSTRAINT "deletion_requests_reason_check" CHECK ("deletion_requests"."reason" IN ('csam', 'ncii', 'threat_violence', 'self_harm', 'doxxing', 'leaked_secret', 'harassment', 'hate_speech', 'defamation', 'impersonation', 'nsfw_shock', 'spam', 'dangerous_content', 'embargo_violation', 'copyright', 'other', 'personal_data_self_erasure', 'compromised_account', 'court_order', 'author_request'));--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_target_type_check" CHECK ("moderation_actions"."target_type" IN ('discussion', 'discussion_reply', 'version', 'discussion_edit', 'discussion_reply_edit'));--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_target_type_check" CHECK ("reports"."target_type" IN ('discussion', 'discussion_reply', 'version', 'discussion_edit', 'discussion_reply_edit'));--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reason_check" CHECK ("reports"."reason" IN ('csam', 'ncii', 'threat_violence', 'self_harm', 'doxxing', 'leaked_secret', 'harassment', 'hate_speech', 'defamation', 'impersonation', 'nsfw_shock', 'spam', 'dangerous_content', 'embargo_violation', 'copyright', 'other', 'personal_data_self_erasure', 'compromised_account', 'court_order', 'author_request'));