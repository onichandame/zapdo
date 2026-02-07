DROP TABLE `user_kek`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user_project_dek` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`project_id` text NOT NULL,
	`encrypted_dek` text NOT NULL,
	`encryption_algorithm` text DEFAULT 'AES-GCM' NOT NULL,
	`key_derivation_version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_user_project_dek`("id", "user_id", "project_id", "encrypted_dek", "encryption_algorithm", "key_derivation_version", "created_at", "updated_at") SELECT "id", "user_id", "project_id", "encrypted_dek", "encryption_algorithm", "key_derivation_version", "created_at", "updated_at" FROM `user_project_dek`;--> statement-breakpoint
DROP TABLE `user_project_dek`;--> statement-breakpoint
ALTER TABLE `__new_user_project_dek` RENAME TO `user_project_dek`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `user_project_dek_user_project_idx` ON `user_project_dek` (`user_id`,`project_id`);--> statement-breakpoint
CREATE INDEX `user_project_dek_user_id_idx` ON `user_project_dek` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_project_dek_project_id_idx` ON `user_project_dek` (`project_id`);