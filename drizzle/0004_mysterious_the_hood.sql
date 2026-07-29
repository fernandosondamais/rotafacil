ALTER TABLE `reservations` ADD `driver_id` text;--> statement-breakpoint
CREATE INDEX `reservations_driver_idx` ON `reservations` (`driver_id`);