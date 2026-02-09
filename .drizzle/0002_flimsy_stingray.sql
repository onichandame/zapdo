ALTER TABLE `task` RENAME TO `tasks`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`due_date` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_tasks`("id", "project_id", "title", "description", "status", "priority", "due_date", "created_at", "updated_at") SELECT "id", "project_id", "title", "description", "status", "priority", "due_date", "created_at", "updated_at" FROM `tasks`;--> statement-breakpoint
DROP TABLE `tasks`;--> statement-breakpoint
ALTER TABLE `__new_tasks` RENAME TO `tasks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `task_project_id_idx` ON `tasks` (`project_id`);--> statement-breakpoint
CREATE INDEX `task_status_idx` ON `tasks` (`status`);--> statement-breakpoint
CREATE INDEX `task_priority_idx` ON `tasks` (`priority`);--> statement-breakpoint
CREATE INDEX `task_due_date_idx` ON `tasks` (`due_date`);--> statement-breakpoint
CREATE TABLE `__new_task_to_tag` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`tag_id` text NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_task_to_tag`("id", "task_id", "tag_id") SELECT "id", "task_id", "tag_id" FROM `task_to_tag`;--> statement-breakpoint
DROP TABLE `task_to_tag`;--> statement-breakpoint
ALTER TABLE `__new_task_to_tag` RENAME TO `task_to_tag`;--> statement-breakpoint
CREATE INDEX `task_to_tag_task_id_idx` ON `task_to_tag` (`task_id`);--> statement-breakpoint
CREATE INDEX `task_to_tag_tag_id_idx` ON `task_to_tag` (`tag_id`);