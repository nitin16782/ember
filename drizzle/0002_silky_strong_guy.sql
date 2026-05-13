CREATE TABLE `attendance_edit_requests` (
	`id` varchar(36) NOT NULL,
	`eventId` varchar(36) NOT NULL,
	`requestedBy` varchar(36) NOT NULL,
	`newEventAt` timestamp NOT NULL,
	`reason` varchar(500) NOT NULL,
	`editRequestStatus` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reviewedBy` varchar(36),
	`reviewedAt` timestamp,
	`reviewNote` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attendance_edit_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `attendance_edit_requests` ADD CONSTRAINT `attendance_edit_requests_eventId_shift_events_id_fk` FOREIGN KEY (`eventId`) REFERENCES `shift_events`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance_edit_requests` ADD CONSTRAINT `attendance_edit_requests_requestedBy_users_id_fk` FOREIGN KEY (`requestedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance_edit_requests` ADD CONSTRAINT `attendance_edit_requests_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `attendance_edit_requests_event_idx` ON `attendance_edit_requests` (`eventId`);--> statement-breakpoint
CREATE INDEX `attendance_edit_requests_status_idx` ON `attendance_edit_requests` (`editRequestStatus`,`createdAt`);