CREATE TABLE `user_project_dek` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`project_id` text NOT NULL,
	`encrypted_dek` text NOT NULL,
	`dek_version` integer DEFAULT 1 NOT NULL,
	`encryption_algorithm` text DEFAULT 'AES-GCM' NOT NULL,
	`key_derivation_version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_project_dek_user_project_version_idx` ON `user_project_dek` (`user_id`,`project_id`,`dek_version`);--> statement-breakpoint
CREATE INDEX `user_project_dek_user_id_idx` ON `user_project_dek` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_project_dek_project_id_idx` ON `user_project_dek` (`project_id`);