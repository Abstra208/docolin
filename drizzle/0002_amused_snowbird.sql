CREATE TABLE "discussion_edits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discussion_id" uuid NOT NULL,
	"prior_body_text" text NOT NULL,
	"prior_body_format" text NOT NULL,
	"edited_by_user_id" uuid NOT NULL,
	"edited_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discussion_reply_edits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discussion_reply_id" uuid NOT NULL,
	"prior_body_text" text NOT NULL,
	"prior_body_format" text NOT NULL,
	"edited_by_user_id" uuid NOT NULL,
	"edited_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deletion_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"requested_by_user_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"related_report_id" uuid,
	"resolved_by_user_id" uuid,
	"resolved_at" timestamp with time zone,
	"resolution_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deletion_requests_target_type_check" CHECK ("deletion_requests"."target_type" IN ('discussion', 'discussion_reply', 'version')),
	CONSTRAINT "deletion_requests_reason_check" CHECK ("deletion_requests"."reason" IN ('csam', 'ncii', 'threat_violence', 'self_harm', 'doxxing', 'leaked_secret', 'harassment', 'hate_speech', 'defamation', 'impersonation', 'nsfw_shock', 'spam', 'dangerous_content', 'embargo_violation', 'copyright', 'other', 'personal_data_self_erasure', 'compromised_account', 'court_order')),
	CONSTRAINT "deletion_requests_status_check" CHECK ("deletion_requests"."status" IN ('pending', 'approved', 'denied', 'withdrawn'))
);
--> statement-breakpoint
CREATE TABLE "moderation_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"action_type" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"related_request_id" uuid,
	"reason" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "moderation_actions_action_type_check" CHECK ("moderation_actions"."action_type" IN ('requested_deletion', 'approved_deletion', 'denied_deletion', 'hidden', 'unhidden', 'redacted', 'dismissed_report', 'escalated_to_deletion', 'hard_deleted')),
	CONSTRAINT "moderation_actions_target_type_check" CHECK ("moderation_actions"."target_type" IN ('discussion', 'discussion_reply', 'version'))
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"reported_by_user_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"status" text DEFAULT 'open' NOT NULL,
	"resolved_by_user_id" uuid,
	"resolved_at" timestamp with time zone,
	"resolution_notes" text,
	"dismissal_then_re_report_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reports_target_type_check" CHECK ("reports"."target_type" IN ('discussion', 'discussion_reply', 'version')),
	CONSTRAINT "reports_reason_check" CHECK ("reports"."reason" IN ('csam', 'ncii', 'threat_violence', 'self_harm', 'doxxing', 'leaked_secret', 'harassment', 'hate_speech', 'defamation', 'impersonation', 'nsfw_shock', 'spam', 'dangerous_content', 'embargo_violation', 'copyright', 'other', 'personal_data_self_erasure', 'compromised_account', 'court_order')),
	CONSTRAINT "reports_status_check" CHECK ("reports"."status" IN ('open', 'dismissed', 'escalated_to_deletion', 'withdrawn'))
);
--> statement-breakpoint
CREATE TABLE "inbox_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"body_markdown" text NOT NULL,
	"link_url" text,
	"related_record_id" uuid,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inbox_messages_kind_check" CHECK ("inbox_messages"."kind" IN ('report_filed_against_you', 'report_resolved', 'content_hidden', 'content_redacted', 'content_unhidden', 'embargo_expired', 'deletion_approved', 'deletion_denied', 'mod_decision_reversed', 'mention', 'discussion_reply'))
);
--> statement-breakpoint
CREATE TABLE "media_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uploader_user_id" uuid NOT NULL,
	"content_hash" text NOT NULL,
	"url" text NOT NULL,
	"mime_type" text,
	"size_bytes" bigint,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"committed" boolean DEFAULT false NOT NULL,
	"last_referenced_at" timestamp with time zone,
	CONSTRAINT "media_uploads_content_hash_unique" UNIQUE("content_hash")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_platform_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "discussion_replies" ADD COLUMN "hidden_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "discussion_replies" ADD COLUMN "hidden_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "discussion_replies" ADD COLUMN "hidden_reason" text;--> statement-breakpoint
ALTER TABLE "discussion_replies" ADD COLUMN "hidden_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "discussion_replies" ADD COLUMN "is_redacted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "discussion_replies" ADD COLUMN "redacted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "discussion_replies" ADD COLUMN "redacted_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "discussion_replies" ADD COLUMN "redacted_reason" text;--> statement-breakpoint
ALTER TABLE "discussions" ADD COLUMN "hidden_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "discussions" ADD COLUMN "hidden_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "discussions" ADD COLUMN "hidden_reason" text;--> statement-breakpoint
ALTER TABLE "discussions" ADD COLUMN "hidden_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "discussions" ADD COLUMN "is_redacted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "discussions" ADD COLUMN "redacted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "discussions" ADD COLUMN "redacted_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "discussions" ADD COLUMN "redacted_reason" text;--> statement-breakpoint
ALTER TABLE "discussion_edits" ADD CONSTRAINT "discussion_edits_discussion_id_discussions_id_fk" FOREIGN KEY ("discussion_id") REFERENCES "public"."discussions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_edits" ADD CONSTRAINT "discussion_edits_edited_by_user_id_users_id_fk" FOREIGN KEY ("edited_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_reply_edits" ADD CONSTRAINT "discussion_reply_edits_discussion_reply_id_discussion_replies_id_fk" FOREIGN KEY ("discussion_reply_id") REFERENCES "public"."discussion_replies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_reply_edits" ADD CONSTRAINT "discussion_reply_edits_edited_by_user_id_users_id_fk" FOREIGN KEY ("edited_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deletion_requests" ADD CONSTRAINT "deletion_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deletion_requests" ADD CONSTRAINT "deletion_requests_related_report_id_reports_id_fk" FOREIGN KEY ("related_report_id") REFERENCES "public"."reports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deletion_requests" ADD CONSTRAINT "deletion_requests_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reported_by_user_id_users_id_fk" FOREIGN KEY ("reported_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_messages" ADD CONSTRAINT "inbox_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_uploads" ADD CONSTRAINT "media_uploads_uploader_user_id_users_id_fk" FOREIGN KEY ("uploader_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discussion_edits_discussion_idx" ON "discussion_edits" USING btree ("discussion_id");--> statement-breakpoint
CREATE INDEX "discussion_reply_edits_reply_idx" ON "discussion_reply_edits" USING btree ("discussion_reply_id");--> statement-breakpoint
CREATE INDEX "deletion_requests_status_idx" ON "deletion_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "deletion_requests_target_idx" ON "deletion_requests" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "deletion_requests_requested_by_idx" ON "deletion_requests" USING btree ("requested_by_user_id");--> statement-breakpoint
CREATE INDEX "deletion_requests_created_at_idx" ON "deletion_requests" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "moderation_actions_actor_idx" ON "moderation_actions" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "moderation_actions_target_idx" ON "moderation_actions" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "moderation_actions_created_at_idx" ON "moderation_actions" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reports_target_idx" ON "reports" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "reports_reported_by_idx" ON "reports" USING btree ("reported_by_user_id");--> statement-breakpoint
CREATE INDEX "reports_created_at_idx" ON "reports" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "inbox_messages_user_idx" ON "inbox_messages" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "inbox_messages_user_unread_idx" ON "inbox_messages" USING btree ("user_id","created_at" DESC NULLS LAST) WHERE "inbox_messages"."read_at" IS NULL;--> statement-breakpoint
CREATE INDEX "media_uploads_uploader_idx" ON "media_uploads" USING btree ("uploader_user_id");--> statement-breakpoint
CREATE INDEX "media_uploads_uncommitted_idx" ON "media_uploads" USING btree ("uploaded_at") WHERE "media_uploads"."committed" = false;--> statement-breakpoint
ALTER TABLE "discussion_replies" ADD CONSTRAINT "discussion_replies_hidden_by_user_id_users_id_fk" FOREIGN KEY ("hidden_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_replies" ADD CONSTRAINT "discussion_replies_redacted_by_user_id_users_id_fk" FOREIGN KEY ("redacted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussions" ADD CONSTRAINT "discussions_hidden_by_user_id_users_id_fk" FOREIGN KEY ("hidden_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussions" ADD CONSTRAINT "discussions_redacted_by_user_id_users_id_fk" FOREIGN KEY ("redacted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discussion_replies_hidden_idx" ON "discussion_replies" USING btree ("hidden_at");--> statement-breakpoint
CREATE INDEX "discussions_hidden_idx" ON "discussions" USING btree ("hidden_at");