CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`reservation_id` text,
	`vehicle_id` text,
	`actor_email` text NOT NULL,
	`actor_name` text NOT NULL,
	`action` text NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_logs_reservation_idx` ON `audit_logs` (`reservation_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_created_at_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `reservation_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`reservation_id` text NOT NULL,
	`stage` text NOT NULL,
	`object_key` text NOT NULL,
	`filename` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`uploaded_by` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reservation_photos_object_key_unique` ON `reservation_photos` (`object_key`);--> statement-breakpoint
CREATE INDEX `reservation_photos_reservation_stage_idx` ON `reservation_photos` (`reservation_id`,`stage`);--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`vehicle_id` text NOT NULL,
	`user_name` text NOT NULL,
	`user_email` text NOT NULL,
	`destination` text NOT NULL,
	`purpose` text DEFAULT 'Visita externa' NOT NULL,
	`start_at` text NOT NULL,
	`end_at` text NOT NULL,
	`status` text DEFAULT 'reserved' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`checkout_at` text,
	`return_at` text,
	`cancelled_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `reservations_vehicle_period_idx` ON `reservations` (`vehicle_id`,`start_at`,`end_at`);--> statement-breakpoint
CREATE INDEX `reservations_status_idx` ON `reservations` (`status`);--> statement-breakpoint
CREATE INDEX `reservations_user_idx` ON `reservations` (`user_email`);--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` text PRIMARY KEY NOT NULL,
	`plate` text NOT NULL,
	`model` text NOT NULL,
	`color` text NOT NULL,
	`category` text DEFAULT 'Utilitário' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vehicles_plate_unique` ON `vehicles` (`plate`);--> statement-breakpoint
CREATE INDEX `vehicles_status_idx` ON `vehicles` (`status`);