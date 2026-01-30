ALTER TABLE `user` RENAME COLUMN "avatar_url" TO "picture_url";--> statement-breakpoint
CREATE TABLE `devices` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`public_key` text NOT NULL,
	`server_private_key` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `devices_user_id_idx` ON `devices` (`user_id`);--> statement-breakpoint
ALTER TABLE `user` ADD `kek_public_key` text;--> statement-breakpoint
ALTER TABLE `user` DROP COLUMN `email_verified`;