CREATE TABLE `signups` (
	`id` text PRIMARY KEY NOT NULL,
	`waitlist_id` text NOT NULL,
	`email` text NOT NULL,
	`position` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`custom_data` text DEFAULT '{}',
	`referral_source` text,
	`ip_address` text,
	`user_agent` text,
	`confirmation_token` text,
	`confirmed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`waitlist_id`) REFERENCES `waitlists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `waitlist_email_unique` ON `signups` (`waitlist_id`,`email`);--> statement-breakpoint
CREATE INDEX `waitlist_position_idx` ON `signups` (`waitlist_id`,`position`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `signups` (`status`);--> statement-breakpoint
CREATE INDEX `confirmation_token_idx` ON `signups` (`confirmation_token`);--> statement-breakpoint
CREATE INDEX `created_at_idx` ON `signups` (`created_at`);--> statement-breakpoint
CREATE TABLE `waitlists` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`logo_url` text,
	`primary_color` text DEFAULT '#6366f1',
	`double_opt_in` integer DEFAULT true,
	`redirect_url` text,
	`custom_fields` text DEFAULT '[]',
	`notify_on_signup` integer DEFAULT true,
	`notify_email` text,
	`webhook_url` text,
	`email_from_name` text,
	`email_subject_confirmation` text,
	`email_subject_welcome` text,
	`allowed_origins` text DEFAULT '[]',
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `waitlists_slug_unique` ON `waitlists` (`slug`);