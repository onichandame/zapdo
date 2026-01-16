DROP INDEX `session_session_token_unique`;--> statement-breakpoint
DROP INDEX `session_session_token_idx`;--> statement-breakpoint
ALTER TABLE `session` DROP COLUMN `session_token`;