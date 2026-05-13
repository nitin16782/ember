CREATE TABLE `daily_summaries` (
	`id` varchar(36) NOT NULL,
	`personId` varchar(36) NOT NULL,
	`propertyId` varchar(36),
	`date` varchar(10) NOT NULL,
	`dailySummaryStatus` enum('present','partial','absent','leave','holiday','weekly_off','absconding') NOT NULL DEFAULT 'absent',
	`totalMinutes` int NOT NULL DEFAULT 0,
	`breakMinutes` int NOT NULL DEFAULT 0,
	`netWorkMinutes` int NOT NULL DEFAULT 0,
	`shiftCount` int NOT NULL DEFAULT 0,
	`breakCount` int NOT NULL DEFAULT 0,
	`firstCheckInAt` timestamp,
	`lastCheckOutAt` timestamp,
	`hasGeofenceViolation` boolean NOT NULL DEFAULT false,
	`geofenceViolationCount` int NOT NULL DEFAULT 0,
	`hasAnomalies` boolean NOT NULL DEFAULT false,
	`anomalyCodes` json,
	`leaveApplicationId` varchar(36),
	`computedAt` timestamp NOT NULL DEFAULT (now()),
	`locked` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `daily_summaries_id` PRIMARY KEY(`id`),
	CONSTRAINT `daily_summaries_person_date_unique` UNIQUE(`personId`,`date`)
);
--> statement-breakpoint
ALTER TABLE `leave_applications` ADD `attendanceSyncedAt` timestamp;--> statement-breakpoint
ALTER TABLE `leave_applications` ADD `coversDailySummaryIds` json;--> statement-breakpoint
ALTER TABLE `people` ADD `phoneVerifiedAt` timestamp;--> statement-breakpoint
ALTER TABLE `people` ADD `lastSeenAt` timestamp;--> statement-breakpoint
ALTER TABLE `properties` ADD `weeklyOffDays` json;--> statement-breakpoint
ALTER TABLE `properties` ADD `minimumDailyWorkMinutes` int DEFAULT 360 NOT NULL;--> statement-breakpoint
ALTER TABLE `shift_events` ADD `selfieKey` varchar(512);--> statement-breakpoint
ALTER TABLE `shift_events` ADD `edited` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `shift_events` ADD `editedAt` timestamp;--> statement-breakpoint
ALTER TABLE `shift_events` ADD `editedBy` varchar(36);--> statement-breakpoint
ALTER TABLE `shift_events` ADD `editReason` varchar(500);--> statement-breakpoint
ALTER TABLE `shift_events` ADD `notes` varchar(500);--> statement-breakpoint
ALTER TABLE `daily_summaries` ADD CONSTRAINT `daily_summaries_personId_people_id_fk` FOREIGN KEY (`personId`) REFERENCES `people`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `daily_summaries` ADD CONSTRAINT `daily_summaries_leaveApplicationId_leave_applications_id_fk` FOREIGN KEY (`leaveApplicationId`) REFERENCES `leave_applications`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `daily_summaries_property_date_idx` ON `daily_summaries` (`propertyId`,`date`);--> statement-breakpoint
CREATE INDEX `daily_summaries_date_status_idx` ON `daily_summaries` (`date`,`dailySummaryStatus`);--> statement-breakpoint
ALTER TABLE `shift_events` ADD CONSTRAINT `shift_events_editedBy_users_id_fk` FOREIGN KEY (`editedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_leave_app_person_dates_status` ON `leave_applications` (`personId`,`fromDate`,`toDate`,`status`);--> statement-breakpoint
CREATE INDEX `idx_shift_event_type_date` ON `shift_events` (`eventType`,`occurredAt`);