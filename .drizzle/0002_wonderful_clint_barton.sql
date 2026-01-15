DROP INDEX `provider_account_idx`;--> statement-breakpoint
DROP INDEX `user_id_idx`;--> statement-breakpoint
CREATE INDEX `oauth_account_provider_account_idx` ON `oauth_account` (`provider`,`provider_account_id`);--> statement-breakpoint
CREATE INDEX `oauth_account_user_id_idx` ON `oauth_account` (`user_id`);--> statement-breakpoint
DROP INDEX `session_token_idx`;--> statement-breakpoint
DROP INDEX `expires_at_idx`;--> statement-breakpoint
CREATE INDEX `session_session_token_idx` ON `session` (`session_token`);--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_expires_at_idx` ON `session` (`expires_at`);