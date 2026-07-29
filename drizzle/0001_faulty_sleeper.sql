CREATE TABLE `agenda_visits` (
	`id` text PRIMARY KEY NOT NULL,
	`driver_id` text NOT NULL,
	`work_site_id` text NOT NULL,
	`vehicle_id` text,
	`visit_date` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`purpose` text DEFAULT 'Visita de obra' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`work_site_id`) REFERENCES `work_sites`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `agenda_visits_driver_period_idx` ON `agenda_visits` (`driver_id`,`visit_date`,`start_time`,`end_time`);--> statement-breakpoint
CREATE INDEX `agenda_visits_vehicle_period_idx` ON `agenda_visits` (`vehicle_id`,`visit_date`,`start_time`,`end_time`);--> statement-breakpoint
CREATE INDEX `agenda_visits_status_idx` ON `agenda_visits` (`status`);--> statement-breakpoint
CREATE INDEX `agenda_visits_work_site_idx` ON `agenda_visits` (`work_site_id`);--> statement-breakpoint
CREATE TABLE `drivers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`color` text DEFAULT '#0f766e' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `drivers_status_idx` ON `drivers` (`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `drivers_name_unique` ON `drivers` (`name`);--> statement-breakpoint
CREATE TABLE `work_sites` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`city` text NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`contact_name` text DEFAULT '' NOT NULL,
	`contact_phone` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `work_sites_status_idx` ON `work_sites` (`status`);--> statement-breakpoint
CREATE INDEX `work_sites_city_idx` ON `work_sites` (`city`);