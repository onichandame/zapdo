CREATE TABLE `oauth_account` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`expires_at` text,
	`scope` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `provider_account_idx` ON `oauth_account` (`provider`,`provider_account_id`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `oauth_account` (`user_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_token` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_session_token_unique` ON `session` (`session_token`);--> statement-breakpoint
CREATE INDEX `session_token_idx` ON `session` (`session_token`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `expires_at_idx` ON `session` (`expires_at`);--> statement-breakpoint
ALTER TABLE `user` ADD `avatar_url` text;--> statement-breakpoint
ALTER TABLE `user` ADD `email_verified` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `created_at` text NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `updated_at` text NOT NULL;--> statement-breakpoint
ALTER TABLE `user` DROP COLUMN `age`;