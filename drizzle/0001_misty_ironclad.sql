CREATE TABLE `assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`personId` int NOT NULL,
	`propertyId` int NOT NULL,
	`roleCode` varchar(50) NOT NULL,
	`shift` enum('morning','evening','full_day','night','24x7') DEFAULT 'full_day',
	`startDate` date NOT NULL,
	`endDate` date,
	`assignmentType` enum('permanent','temporary','transfer') NOT NULL DEFAULT 'permanent',
	`reason` text,
	`assignmentStatus` enum('active','ended','cancelled') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorId` int,
	`actorRole` varchar(50),
	`action` varchar(100) NOT NULL,
	`entityType` varchar(50) NOT NULL,
	`entityId` int,
	`beforeValue` json,
	`afterValue` json,
	`reasonCode` varchar(32),
	`reasonNote` text,
	`ip` varchar(45),
	`userAgent` text,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`dateIn` date NOT NULL,
	`dateOut` date NOT NULL,
	`guestCount` int,
	`guestName` varchar(255),
	`source` varchar(100),
	`externalRef` varchar(255),
	`notes` text,
	`bookingStatus` enum('confirmed','tentative','cancelled','completed') NOT NULL DEFAULT 'confirmed',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bookings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `breakages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`inventoryItemId` int,
	`description` text NOT NULL,
	`attributedTo` int,
	`attributionStatus` enum('unattributed','associate','guest','accidental','wear') NOT NULL DEFAULT 'unattributed',
	`estimatedCost` decimal(10,2),
	`photoUrls` json,
	`breakageStatus` enum('logged','under_review','resolved','written_off','recovered') NOT NULL DEFAULT 'logged',
	`recoveryAmount` decimal(10,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `breakages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `candidates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requisitionId` int,
	`fullName` varchar(255) NOT NULL,
	`phone` varchar(20),
	`email` varchar(320),
	`resumeUrl` varchar(512),
	`source` enum('referral','direct','agency','walk_in','social_media'),
	`referralId` int,
	`agencyName` varchar(255),
	`expectedSalary` decimal(12,2),
	`availabilityDate` date,
	`interviewNotes` text,
	`status` enum('new','screening','interview','offer_extended','offer_accepted','offer_declined','rejected','dropped','hired') NOT NULL DEFAULT 'new',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `candidates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contract_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`label` varchar(255) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`appliesToStaffType` varchar(50),
	`entity` varchar(255),
	`templateHtml` text,
	`mergeFields` json,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contract_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`personId` int NOT NULL,
	`templateId` int,
	`templateCode` varchar(50),
	`mergeValues` json,
	`generatedPdfUrl` varchar(512),
	`signedPdfUrl` varchar(512),
	`status` enum('draft','sent','signed','active','expired','superseded','cancelled') NOT NULL DEFAULT 'draft',
	`issuedAt` timestamp,
	`signedAt` timestamp,
	`effectiveFrom` date,
	`effectiveTo` date,
	`supersedesId` int,
	`signatureProvider` varchar(50),
	`signatureRequestId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contracts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daily_checklists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`checklistDate` date NOT NULL,
	`submittedBy` int,
	`submittedAt` timestamp,
	`sections` json,
	`photos` json,
	`checklistStatus` enum('pending','submitted','reviewed','flagged') NOT NULL DEFAULT 'pending',
	`flags` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `daily_checklists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`personId` int NOT NULL,
	`exitType` enum('resignation','termination','absconding','contract_end','mutual') NOT NULL,
	`initiatedAt` timestamp DEFAULT (now()),
	`initiatedBy` int,
	`lastWorkingDay` date,
	`checklist` json,
	`ffAmount` decimal(12,2),
	`ffProcessedAt` timestamp,
	`reason` text,
	`notes` text,
	`exitStatus` enum('initiated','in_progress','completed','reversed') NOT NULL DEFAULT 'initiated',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int,
	`incurredAt` date NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`gstAmount` decimal(12,2),
	`totalAmount` decimal(12,2),
	`vendorId` int,
	`expenseCategory` enum('utility','food','maintenance','consumables','vendor','staff','other') NOT NULL,
	`subCategory` varchar(100),
	`billable` boolean DEFAULT true,
	`markupApplied` decimal(10,2),
	`description` text,
	`billUrl` varchar(512),
	`paymentMethod` enum('omni_card','omni_upi','cash_advance','personal','bank_transfer'),
	`omniTxnId` varchar(100),
	`capturedBy` int,
	`capturedAt` timestamp DEFAULT (now()),
	`expenseApprovalStatus` enum('pending','approved','rejected','auto_approved') NOT NULL DEFAULT 'pending',
	`approvedBy` int,
	`approvedAt` timestamp,
	`rejectionReason` text,
	`invoiceId` int,
	`expenseStatus` enum('captured','approved','invoiced','reimbursed','rejected') NOT NULL DEFAULT 'captured',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fee_structures` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`monthlyFee` decimal(12,2),
	`expenseMarkupPct` decimal(5,2),
	`manpowerBillingMode` enum('cost_plus','fixed_per_role','fixed_total'),
	`manpowerTerms` json,
	`otherCharges` json,
	`paymentTerms` varchar(255),
	`gstTreatment` enum('regular','sez','export') DEFAULT 'regular',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fee_structures_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`personId` int NOT NULL,
	`propertyId` int,
	`source` varchar(50),
	`type` enum('appreciation','complaint','observation') NOT NULL,
	`severity` enum('low','medium','high','critical'),
	`description` text NOT NULL,
	`actionTaken` text,
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`feedbackStatus` enum('open','reviewed','resolved','dismissed') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `id_cards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`personId` int NOT NULL,
	`cardNumber` varchar(32) NOT NULL,
	`qrToken` varchar(128) NOT NULL,
	`photoUrl` varchar(512),
	`designation` varchar(150),
	`propertyId` int,
	`validFrom` date,
	`validUntil` date,
	`generatedAt` timestamp DEFAULT (now()),
	`generatedPdfUrl` varchar(512),
	`idCardStatus` enum('active','expired','revoked') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `id_cards_id` PRIMARY KEY(`id`),
	CONSTRAINT `id_cards_cardNumber_unique` UNIQUE(`cardNumber`),
	CONSTRAINT `id_cards_qrToken_unique` UNIQUE(`qrToken`)
);
--> statement-breakpoint
CREATE TABLE `inventory_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(100),
	`location` varchar(255),
	`quantity` int DEFAULT 1,
	`unit` varchar(50),
	`itemCondition` enum('new','good','fair','poor','damaged') DEFAULT 'good',
	`purchasedAt` date,
	`expectedLifeMonths` int,
	`lastAuditedAt` timestamp,
	`photoUrls` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventory_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceNo` varchar(50) NOT NULL,
	`propertyId` int NOT NULL,
	`ownerId` int NOT NULL,
	`invoiceDate` date NOT NULL,
	`dueDate` date NOT NULL,
	`monthCovered` varchar(7) NOT NULL,
	`manpowerAmount` decimal(12,2),
	`expenseAmount` decimal(12,2),
	`managementFee` decimal(12,2),
	`otherCharges` decimal(12,2),
	`subtotal` decimal(12,2),
	`gstAmount` decimal(12,2),
	`totalAmount` decimal(12,2) NOT NULL,
	`amountPaid` decimal(12,2) DEFAULT '0',
	`amountOutstanding` decimal(12,2),
	`lineItems` json,
	`gstTreatment` json,
	`eInvoiceIrn` varchar(255),
	`pdfUrl` varchar(512),
	`issuedAt` timestamp,
	`invoiceStatus` enum('draft','issued','partially_paid','paid','overdue','disputed','cancelled') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_invoiceNo_unique` UNIQUE(`invoiceNo`)
);
--> statement-breakpoint
CREATE TABLE `leave_applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`personId` int NOT NULL,
	`policyId` int NOT NULL,
	`leaveType` varchar(50) NOT NULL,
	`fromDate` date NOT NULL,
	`toDate` date NOT NULL,
	`days` decimal(4,1) NOT NULL,
	`halfDayStart` boolean DEFAULT false,
	`halfDayEnd` boolean DEFAULT false,
	`reason` text,
	`status` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
	`appliedAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`reviewNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leave_applications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leave_balances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`personId` int NOT NULL,
	`policyId` int NOT NULL,
	`balance` decimal(5,1) NOT NULL DEFAULT '0',
	`earnedToDate` decimal(5,1) NOT NULL DEFAULT '0',
	`usedToDate` decimal(5,1) NOT NULL DEFAULT '0',
	`lastAccrualAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leave_balances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leave_policies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`appliesToStaffType` varchar(50),
	`appliesToRoleId` int,
	`leaveType` enum('casual','sick','earned','unpaid','comp_off','maternity','paternity') NOT NULL,
	`accrualRate` decimal(5,2),
	`maxBalance` decimal(5,1),
	`carryForwardPct` decimal(5,2) DEFAULT '0',
	`encashmentAllowed` boolean DEFAULT false,
	`probationBlockDays` int DEFAULT 0,
	`prorateOnJoin` boolean DEFAULT true,
	`minNoticeDays` int DEFAULT 0,
	`maxConsecutiveDays` int,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leave_policies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monthly_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`month` varchar(7) NOT NULL,
	`generatedAt` timestamp,
	`dataSnapshot` json,
	`pdfUrl` varchar(512),
	`sharedAt` timestamp,
	`reportStatus` enum('draft','review','shared') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `monthly_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientId` int NOT NULL,
	`recipientType` enum('staff','owner') NOT NULL,
	`eventType` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text,
	`channel` enum('in_app','email','whatsapp','sms') NOT NULL DEFAULT 'in_app',
	`sentAt` timestamp,
	`readAt` timestamp,
	`metadata` json,
	`notificationStatus` enum('queued','sent','delivered','failed','read') NOT NULL DEFAULT 'queued',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `onboarding_checklists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`personId` int NOT NULL,
	`items` json,
	`status` enum('in_progress','complete','blocked') NOT NULL DEFAULT 'in_progress',
	`blockerReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `onboarding_checklists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `owners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`name` varchar(255) NOT NULL,
	`ownerType` enum('individual','company','family_trust') NOT NULL DEFAULT 'individual',
	`primaryContact` varchar(255),
	`phone` varchar(20),
	`email` varchar(320),
	`alternateContacts` json,
	`billingAddress` text,
	`gstin` varchar(20),
	`pan` varchar(10),
	`notificationPrefs` json,
	`notes` text,
	`ownerStatus` enum('active','churned') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `owners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceId` int NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`paidAt` timestamp,
	`paymentMethod` enum('cashfree','bank_transfer','cheque','upi_direct','adjustment'),
	`cashfreePaymentId` varchar(255),
	`bankReference` varchar(255),
	`notes` text,
	`paymentStatus` enum('captured','reconciled','refunded','disputed') NOT NULL DEFAULT 'captured',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payroll_deductions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`payrollLineId` int NOT NULL,
	`personId` int NOT NULL,
	`code` enum('ADV','ABS','DMG','DIS','OPS','TAX','STAT','OTHER') NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`reasonNote` text,
	`evidenceUrl` varchar(512),
	`requestedBy` int,
	`requestedAt` timestamp,
	`approvalStatus` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`approvedBy` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payroll_deductions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payroll_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`payrollRunId` int NOT NULL,
	`personId` int NOT NULL,
	`workingDays` decimal(5,1),
	`leaveDays` decimal(5,1),
	`absentDays` decimal(5,1),
	`netWorkMinutes` int,
	`grossPay` decimal(12,2),
	`deductionsTotal` decimal(12,2),
	`netPay` decimal(12,2),
	`holdApplied` boolean DEFAULT false,
	`payslipPdfUrl` varchar(512),
	`status` enum('pending','calculated','approved','paid') NOT NULL DEFAULT 'pending',
	`calculationInputs` json,
	`calculatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payroll_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payroll_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cycleMonth` varchar(7) NOT NULL,
	`entity` varchar(255),
	`staffTypes` json,
	`cutoffDate` date,
	`status` enum('draft','locked','finalized','reverted') NOT NULL DEFAULT 'draft',
	`initiatedBy` int,
	`initiatedAt` timestamp DEFAULT (now()),
	`finalizedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payroll_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `people` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`fullName` varchar(255) NOT NULL,
	`photoUrl` varchar(512),
	`dob` date,
	`gender` enum('male','female','other'),
	`languagesSpoken` json,
	`primaryPhone` varchar(20) NOT NULL,
	`alternatePhone` varchar(20),
	`email` varchar(320),
	`currentAddress` text,
	`permanentAddress` text,
	`emergencyContact` json,
	`aadhaarMasked` varchar(12),
	`pan` varchar(10),
	`bankAccount` varchar(30),
	`bankIfsc` varchar(11),
	`bankName` varchar(150),
	`staffType` enum('associate','full_time','trainee','stipend') NOT NULL,
	`employmentStatus` enum('active','on_leave','exited','absconding') NOT NULL DEFAULT 'active',
	`designation` varchar(150),
	`joiningDate` date,
	`homePropertyId` int,
	`currentSupervisorId` int,
	`source` enum('referral','direct','agency','walk_in','social_media'),
	`referrerId` int,
	`agencyName` varchar(255),
	`deployable` boolean DEFAULT false,
	`documentsVerified` boolean DEFAULT false,
	`currentSalary` decimal(12,2),
	`salaryStructure` json,
	`dailyRate` decimal(10,2),
	`documents` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `people_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `performance_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`personId` int NOT NULL,
	`reviewerId` int NOT NULL,
	`reviewPeriodStart` date NOT NULL,
	`reviewPeriodEnd` date NOT NULL,
	`reviewData` json,
	`outcome` enum('increment','promotion','pip','exit','no_change'),
	`revieweeSignoffAt` timestamp,
	`opsLeadSignoffAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `performance_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `properties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`propertyType` enum('villa','second_home','hotel','apartment') NOT NULL,
	`address` text,
	`city` varchar(100),
	`state` varchar(100),
	`pincode` varchar(10),
	`gpsLat` decimal(10,7),
	`gpsLng` decimal(11,7),
	`geofenceRadiusM` int DEFAULT 100,
	`geofenceLenient` boolean DEFAULT false,
	`bedroomCount` int,
	`bathroomCount` int,
	`sqFt` int,
	`amenities` json,
	`roomMap` json,
	`photos` json,
	`primaryOwnerId` int,
	`assignedPmId` int,
	`feeStructureId` int,
	`slaId` int,
	`onboardedAt` timestamp,
	`churnedAt` timestamp,
	`churnReason` text,
	`propertyStatus` enum('onboarding','live','paused','churned') NOT NULL DEFAULT 'onboarding',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `properties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `property_owners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`ownerId` int NOT NULL,
	`ownershipPct` decimal(5,2),
	`isPrimary` boolean DEFAULT false,
	`permissions` json,
	CONSTRAINT `property_owners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referrerPersonId` int NOT NULL,
	`candidateId` int,
	`candidateName` varchar(255) NOT NULL,
	`candidatePhone` varchar(20) NOT NULL,
	`referredAt` timestamp DEFAULT (now()),
	`notes` text,
	`referralStatus` enum('pending','converted','rejected','withdrawn') NOT NULL DEFAULT 'pending',
	`bountyAmount` decimal(10,2),
	`tranche1PaidAt` timestamp,
	`tranche2PaidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `referrals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`ownerId` int NOT NULL,
	`type` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`requestPriority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`assignedTo` int,
	`resolvedAt` timestamp,
	`resolution` text,
	`requestStatus` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `requisitions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int,
	`roleCode` enum('housekeeping','kitchen','f_and_b','maintenance','security','supervisor','manager','other') NOT NULL,
	`headcount` int NOT NULL DEFAULT 1,
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`raisedBy` int,
	`targetCloseDate` date,
	`interviewOwnerRole` varchar(50),
	`status` enum('open','in_progress','filled','cancelled') NOT NULL DEFAULT 'open',
	`filledByPersonId` int,
	`filledAt` timestamp,
	`fillNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `requisitions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `salary_holds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`personId` int NOT NULL,
	`payrollLineId` int,
	`reason` varchar(255) NOT NULL,
	`reasonNote` text,
	`amount` decimal(12,2),
	`appliedBy` int,
	`appliedAt` timestamp DEFAULT (now()),
	`expiresAt` timestamp,
	`releasedBy` int,
	`releasedAt` timestamp,
	`releaseNote` text,
	`status` enum('active','released','expired') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `salary_holds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shift_event_edits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shiftEventId` int NOT NULL,
	`editedBy` int NOT NULL,
	`editedAt` timestamp NOT NULL DEFAULT (now()),
	`beforeValue` json,
	`afterValue` json,
	`reasonCode` varchar(32) NOT NULL,
	`reasonNote` text,
	`approvedBy` int,
	`approvedAt` timestamp,
	`approvalStatus` enum('not_required','pending','approved','rejected') NOT NULL DEFAULT 'not_required',
	CONSTRAINT `shift_event_edits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shift_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`personId` int NOT NULL,
	`propertyId` int,
	`eventType` enum('check_in','break_start','break_end','check_out') NOT NULL,
	`occurredAt` timestamp NOT NULL,
	`markMode` enum('verified_self','supervisor_marked','imported','retro_edit') NOT NULL,
	`markedBy` int NOT NULL,
	`gpsLat` decimal(10,7),
	`gpsLng` decimal(11,7),
	`withinGeofence` boolean,
	`geofenceDistanceM` int,
	`selfieUrl` varchar(512),
	`deviceId` varchar(128),
	`shiftSessionId` varchar(36),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shift_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `slas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`responseTimeHours` int,
	`monthlyVisitCount` int,
	`reportingFrequency` enum('weekly','monthly') DEFAULT 'monthly',
	`photoCadencePerMonth` int DEFAULT 50,
	`issueResolutionTargets` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `slas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `training_completions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`personId` int NOT NULL,
	`moduleId` int NOT NULL,
	`assignedAt` timestamp DEFAULT (now()),
	`startedAt` timestamp,
	`completedAt` timestamp,
	`signedOffBy` int,
	`score` int,
	`status` enum('assigned','in_progress','completed','expired') NOT NULL DEFAULT 'assigned',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `training_completions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `training_modules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`roleCodes` json,
	`staffTypes` json,
	`completionType` enum('read','quiz','video','signoff') NOT NULL DEFAULT 'read',
	`contentUrl` varchar(512),
	`mandatory` boolean DEFAULT false,
	`active` boolean NOT NULL DEFAULT true,
	`expiresAfterDays` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `training_modules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(100),
	`contactName` varchar(255),
	`phone` varchar(20),
	`email` varchar(320),
	`gstin` varchar(20),
	`paymentTerms` varchar(255),
	`propertiesServed` json,
	`avgRating` decimal(3,1),
	`vendorStatus` enum('active','blacklisted','inactive') NOT NULL DEFAULT 'active',
	`blacklistReason` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vendors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `work_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`vendorId` int NOT NULL,
	`raisedBy` int,
	`description` text NOT NULL,
	`quotedAmount` decimal(12,2),
	`scheduledFor` date,
	`completedAt` timestamp,
	`finalAmount` decimal(12,2),
	`rating` int,
	`expenseId` int,
	`workOrderStatus` enum('raised','accepted','in_progress','completed','cancelled','disputed') NOT NULL DEFAULT 'raised',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `work_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('super_admin','central_admin','ops_lead','supply_lead','finance_admin','property_manager','supervisor','associate','owner_portal','user','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `permissionOverrides` json;--> statement-breakpoint
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_personId_people_id_fk` FOREIGN KEY (`personId`) REFERENCES `people`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `breakages` ADD CONSTRAINT `breakages_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `candidates` ADD CONSTRAINT `candidates_requisitionId_requisitions_id_fk` FOREIGN KEY (`requisitionId`) REFERENCES `requisitions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_personId_people_id_fk` FOREIGN KEY (`personId`) REFERENCES `people`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_templateId_contract_templates_id_fk` FOREIGN KEY (`templateId`) REFERENCES `contract_templates`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `daily_checklists` ADD CONSTRAINT `daily_checklists_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exits` ADD CONSTRAINT `exits_personId_people_id_fk` FOREIGN KEY (`personId`) REFERENCES `people`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `feedback` ADD CONSTRAINT `feedback_personId_people_id_fk` FOREIGN KEY (`personId`) REFERENCES `people`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `id_cards` ADD CONSTRAINT `id_cards_personId_people_id_fk` FOREIGN KEY (`personId`) REFERENCES `people`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_ownerId_owners_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `owners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leave_applications` ADD CONSTRAINT `leave_applications_personId_people_id_fk` FOREIGN KEY (`personId`) REFERENCES `people`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leave_applications` ADD CONSTRAINT `leave_applications_policyId_leave_policies_id_fk` FOREIGN KEY (`policyId`) REFERENCES `leave_policies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leave_balances` ADD CONSTRAINT `leave_balances_personId_people_id_fk` FOREIGN KEY (`personId`) REFERENCES `people`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leave_balances` ADD CONSTRAINT `leave_balances_policyId_leave_policies_id_fk` FOREIGN KEY (`policyId`) REFERENCES `leave_policies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monthly_reports` ADD CONSTRAINT `monthly_reports_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `onboarding_checklists` ADD CONSTRAINT `onboarding_checklists_personId_people_id_fk` FOREIGN KEY (`personId`) REFERENCES `people`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `owners` ADD CONSTRAINT `owners_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_invoiceId_invoices_id_fk` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payroll_deductions` ADD CONSTRAINT `payroll_deductions_payrollLineId_payroll_lines_id_fk` FOREIGN KEY (`payrollLineId`) REFERENCES `payroll_lines`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payroll_deductions` ADD CONSTRAINT `payroll_deductions_personId_people_id_fk` FOREIGN KEY (`personId`) REFERENCES `people`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payroll_lines` ADD CONSTRAINT `payroll_lines_payrollRunId_payroll_runs_id_fk` FOREIGN KEY (`payrollRunId`) REFERENCES `payroll_runs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payroll_lines` ADD CONSTRAINT `payroll_lines_personId_people_id_fk` FOREIGN KEY (`personId`) REFERENCES `people`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `people` ADD CONSTRAINT `people_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `performance_reviews` ADD CONSTRAINT `performance_reviews_personId_people_id_fk` FOREIGN KEY (`personId`) REFERENCES `people`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `property_owners` ADD CONSTRAINT `property_owners_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `property_owners` ADD CONSTRAINT `property_owners_ownerId_owners_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `owners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_referrerPersonId_people_id_fk` FOREIGN KEY (`referrerPersonId`) REFERENCES `people`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `requests` ADD CONSTRAINT `requests_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `requests` ADD CONSTRAINT `requests_ownerId_owners_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `owners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `salary_holds` ADD CONSTRAINT `salary_holds_personId_people_id_fk` FOREIGN KEY (`personId`) REFERENCES `people`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shift_event_edits` ADD CONSTRAINT `shift_event_edits_shiftEventId_shift_events_id_fk` FOREIGN KEY (`shiftEventId`) REFERENCES `shift_events`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shift_events` ADD CONSTRAINT `shift_events_personId_people_id_fk` FOREIGN KEY (`personId`) REFERENCES `people`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `training_completions` ADD CONSTRAINT `training_completions_personId_people_id_fk` FOREIGN KEY (`personId`) REFERENCES `people`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `training_completions` ADD CONSTRAINT `training_completions_moduleId_training_modules_id_fk` FOREIGN KEY (`moduleId`) REFERENCES `training_modules`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_vendorId_vendors_id_fk` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_assignment_property` ON `assignments` (`propertyId`,`assignmentStatus`);--> statement-breakpoint
CREATE INDEX `idx_assignment_person` ON `assignments` (`personId`,`assignmentStatus`);--> statement-breakpoint
CREATE INDEX `idx_audit_entity` ON `audit_log` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `idx_audit_actor` ON `audit_log` (`actorId`);--> statement-breakpoint
CREATE INDEX `idx_audit_time` ON `audit_log` (`occurredAt`);--> statement-breakpoint
CREATE INDEX `idx_people_status` ON `people` (`employmentStatus`);--> statement-breakpoint
CREATE INDEX `idx_people_type` ON `people` (`staffType`);--> statement-breakpoint
CREATE INDEX `idx_people_property` ON `people` (`homePropertyId`);--> statement-breakpoint
CREATE INDEX `idx_shift_person_date` ON `shift_events` (`personId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `idx_shift_property_date` ON `shift_events` (`propertyId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `idx_shift_session` ON `shift_events` (`shiftSessionId`);