DROP INDEX `user_project_dek_user_project_version_idx`;--> statement-breakpoint
ALTER TABLE `user_project_dek` ADD `user_kek_id` text NOT NULL REFERENCES user_kek(id);--> statement-breakpoint
CREATE UNIQUE INDEX `user_project_dek_user_project_idx` ON `user_project_dek` (`user_id`,`project_id`);--> statement-breakpoint
ALTER TABLE `user_project_dek` DROP COLUMN `dek_version`;