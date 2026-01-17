ALTER TABLE `project` ADD `parent_id` text REFERENCES project(id);--> statement-breakpoint
CREATE INDEX `project_parent_id_idx` ON `project` (`parent_id`);