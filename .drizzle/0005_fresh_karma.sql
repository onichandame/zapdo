CREATE TABLE `user_kek` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`key_derivation_salt` text NOT NULL,
	`key_derivation_iterations` integer DEFAULT 100000 NOT NULL,
	`key_derivation_algorithm` text DEFAULT 'PBKDF2-SHA256' NOT NULL,
	`key_version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_kek_user_id_key_version_idx` ON `user_kek` (`user_id`,`key_version`);