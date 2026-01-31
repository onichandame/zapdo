CREATE TABLE `device_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`requesting_device_name` text NOT NULL,
	`requesting_device_type` text NOT NULL,
	`requesting_device_temp_public_key` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`encrypted_kek_private_key` text,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `device_requests_user_id_idx` ON `device_requests` (`user_id`);--> statement-breakpoint
CREATE INDEX `device_requests_status_idx` ON `device_requests` (`status`);--> statement-breakpoint
CREATE INDEX `device_requests_expires_at_idx` ON `device_requests` (`expires_at`);--> statement-breakpoint
CREATE TABLE `devices` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`public_key` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `devices_user_id_idx` ON `devices` (`user_id`);--> statement-breakpoint
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
CREATE INDEX `oauth_account_provider_account_idx` ON `oauth_account` (`provider`,`provider_account_id`);--> statement-breakpoint
CREATE INDEX `oauth_account_user_id_idx` ON `oauth_account` (`user_id`);--> statement-breakpoint
CREATE TABLE `project` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`parent_id` text,
	`name` text NOT NULL,
	`description` text,
	`color` text NOT NULL,
	`icon` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `project_user_id_idx` ON `project` (`user_id`);--> statement-breakpoint
CREATE INDEX `project_parent_id_idx` ON `project` (`parent_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_expires_at_idx` ON `session` (`expires_at`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`picture_url` text,
	`kek_public_key` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `user_kek` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`key_derivation_salt` text NOT NULL,
	`key_derivation_iterations` integer DEFAULT 100000 NOT NULL,
	`key_derivation_algorithm` text DEFAULT 'PBKDF2-SHA256' NOT NULL,
	`public_key` text NOT NULL,
	`encrypted_private_key` text NOT NULL,
	`asymmetric_algorithm` text DEFAULT 'RSA-OAEP' NOT NULL,
	`key_format` text DEFAULT 'JWK' NOT NULL,
	`key_version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_kek_user_id_key_version_idx` ON `user_kek` (`user_id`,`key_version`);--> statement-breakpoint
CREATE INDEX `user_kek_user_id_idx` ON `user_kek` (`user_id`);--> statement-breakpoint
CREATE TABLE `user_project_dek` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`project_id` text NOT NULL,
	`user_kek_id` text NOT NULL,
	`encrypted_dek` text NOT NULL,
	`encryption_algorithm` text DEFAULT 'AES-GCM' NOT NULL,
	`key_derivation_version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_kek_id`) REFERENCES `user_kek`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_project_dek_user_project_idx` ON `user_project_dek` (`user_id`,`project_id`);--> statement-breakpoint
CREATE INDEX `user_project_dek_user_id_idx` ON `user_project_dek` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_project_dek_project_id_idx` ON `user_project_dek` (`project_id`);