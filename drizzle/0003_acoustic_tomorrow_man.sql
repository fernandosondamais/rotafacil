CREATE TABLE `maintenance_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`vehicle_id` text NOT NULL,
	`driver_id` text NOT NULL,
	`start_at` text NOT NULL,
	`end_at` text NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`service_description` text NOT NULL,
	`provider` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `maintenance_schedules_vehicle_period_idx` ON `maintenance_schedules` (`vehicle_id`,`start_at`,`end_at`);--> statement-breakpoint
CREATE INDEX `maintenance_schedules_driver_idx` ON `maintenance_schedules` (`driver_id`);--> statement-breakpoint
CREATE INDEX `maintenance_schedules_status_idx` ON `maintenance_schedules` (`status`);