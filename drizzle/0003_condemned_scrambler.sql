CREATE TABLE `attendance_audit_log` (
	`id` varchar(36) NOT NULL,
	`actorUserId` varchar(36) NOT NULL,
	`actorRole` varchar(50) NOT NULL,
	`attendanceAuditAction` enum('mark_event','mark_event_on_behalf','request_edit','approve_edit','reject_edit','manual_summary_recompute','lock_summary') NOT NULL,
	`targetPersonId` varchar(36),
	`targetEventId` varchar(36),
	`targetEditRequestId` varchar(36),
	`targetSummaryId` varchar(36),
	`payload` json,
	`ipAddress` varchar(45),
	`userAgent` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attendance_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `attendance_audit_log` ADD CONSTRAINT `attendance_audit_log_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance_audit_log` ADD CONSTRAINT `attendance_audit_log_targetPersonId_people_id_fk` FOREIGN KEY (`targetPersonId`) REFERENCES `people`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance_audit_log` ADD CONSTRAINT `attendance_audit_log_targetEventId_shift_events_id_fk` FOREIGN KEY (`targetEventId`) REFERENCES `shift_events`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance_audit_log` ADD CONSTRAINT `attendance_audit_log_targetEditRequestId_fk` FOREIGN KEY (`targetEditRequestId`) REFERENCES `attendance_edit_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance_audit_log` ADD CONSTRAINT `attendance_audit_log_targetSummaryId_fk` FOREIGN KEY (`targetSummaryId`) REFERENCES `daily_summaries`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `attendance_audit_actor_idx` ON `attendance_audit_log` (`actorUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `attendance_audit_target_person_idx` ON `attendance_audit_log` (`targetPersonId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `attendance_audit_action_idx` ON `attendance_audit_log` (`attendanceAuditAction`,`createdAt`);--> statement-breakpoint
CREATE INDEX `attendance_audit_created_at_idx` ON `attendance_audit_log` (`createdAt`);