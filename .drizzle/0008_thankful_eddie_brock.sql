ALTER TABLE `user_kek` ADD `public_key` text NOT NULL;--> statement-breakpoint
ALTER TABLE `user_kek` ADD `encrypted_private_key` text NOT NULL;--> statement-breakpoint
ALTER TABLE `user_kek` ADD `asymmetric_algorithm` text DEFAULT 'RSA-OAEP' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_kek` ADD `key_format` text DEFAULT 'JWK' NOT NULL;--> statement-breakpoint
CREATE INDEX `user_kek_user_id_idx` ON `user_kek` (`user_id`);