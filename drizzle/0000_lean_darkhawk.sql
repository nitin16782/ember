CREATE TABLE `assignments` (
	`id` varchar(36) NOT NULL,
	`personId` varchar(36) NOT NULL,
	`propertyId` varchar(36) NOT NULL,
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
	`id` varchar(36) NOT NULL,
	`actorId` varchar(36),
	`actorRole` varchar(50),
	`action` varchar(100) NOT NULL,
	`entityType` varchar(50) NOT NULL,
	`entityId` varchar(36),
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
CREATE TABLE `auth_credentials` (
	`id` varchar(36) NOT NULL,
	`userId` varchar(36) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`passwordSetAt` timestamp NOT NULL DEFAULT (now()),
	`mustChangePassword` boolean NOT NULL DEFAULT false,
	`failedAttempts` int NOT NULL DEFAULT 0,
	`lockedUntil` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `auth_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_credentials_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` varchar(36) NOT NULL,
	`propertyId` varchar(36) NOT NULL,
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
	`id` varchar(36) NOT NULL,
	`propertyId` varchar(36) NOT NULL,
	`inventoryItemId` varchar(36),
	`description` text NOT NULL,
	`attributedTo` varchar(36),
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
	`id` varchar(36) NOT NULL,
	`fullName` varchar(255) NOT NULL,
	`phone` varchar(20),
	`email` varchar(320),
	`resumeUrl` varchar(512),
	`source` enum('referral','direct','agency','walk_in','social_media'),
	`referralId` varchar(36),
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
	`id` varchar(36) NOT NULL,
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
	`id` varchar(36) NOT NULL,
	`personId` varchar(36) NOT NULL,
	`templateId` varchar(36),
	`templateCode` varchar(50),
	`mergeValues` json,
	`generatedPdfUrl` varchar(512),
	`signedPdfUrl` varchar(512),
	`status` enum('draft','sent','signed','active','expired','superseded','cancelled') NOT NULL DEFAULT 'draft',
	`issuedAt` timestamp,
	`signedAt` timestamp,
	`effectiveFrom` date,
	`effectiveTo` date,
	`supersedesId` varchar(36),
	`signatureProvider` varchar(50),
	`signatureRequestId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contracts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daily_checklists` (
	`id` varchar(36) NOT NULL,
	`propertyId` varchar(36) NOT NULL,
	`checklistDate` date NOT NULL,
	`submittedBy` varchar(36),
	`submittedAt` timestamp,
	`sections` json,
	`photos` json,
	`checklistStatus` enum('pending','submitted','reviewed','flagged') NOT NULL DEFAULT 'pending',
	`flags` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `daily_checklists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `entities` (
	`id` varchar(36) NOT NULL,
	`legalName` varchar(255) NOT NULL,
	`gstin` varchar(15) NOT NULL,
	`pan` varchar(10),
	`registeredAddress` text,
	`state` varchar(64),
	`stateCode` varchar(2),
	`bankAccountNumber` varchar(30),
	`bankIfsc` varchar(11),
	`bankName` varchar(150),
	`invoicePrefix` varchar(16),
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `entities_id` PRIMARY KEY(`id`),
	CONSTRAINT `entities_gstin_unique` UNIQUE(`gstin`)
);
--> statement-breakpoint
CREATE TABLE `exits` (
	`id` varchar(36) NOT NULL,
	`personId` varchar(36) NOT NULL,
	`exitType` enum('resignation','termination','absconding','contract_end','mutual') NOT NULL,
	`initiatedAt` timestamp DEFAULT (now()),
	`initiatedBy` varchar(36),
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
	`id` varchar(36) NOT NULL,
	`propertyId` varchar(36),
	`incurredAt` date NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`gstAmount` decimal(12,2),
	`totalAmount` decimal(12,2),
	`vendorId` varchar(36),
	`expenseCategory` enum('utility','food','maintenance','consumables','vendor','staff','other') NOT NULL,
	`subCategory` varchar(100),
	`billable` boolean DEFAULT true,
	`markupApplied` decimal(10,2),
	`description` text,
	`billUrl` varchar(512),
	`paymentMethod` enum('omni_card','omni_upi','cash_advance','personal','bank_transfer'),
	`omniTxnId` varchar(100),
	`capturedBy` varchar(36),
	`capturedAt` timestamp DEFAULT (now()),
	`expenseApprovalStatus` enum('pending','approved','rejected','auto_approved') NOT NULL DEFAULT 'pending',
	`approvedBy` varchar(36),
	`approvedAt` timestamp,
	`rejectionReason` text,
	`invoiceId` varchar(36),
	`expenseStatus` enum('captured','approved','invoiced','reimbursed','rejected') NOT NULL DEFAULT 'captured',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fee_structures` (
	`id` varchar(36) NOT NULL,
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
	`id` varchar(36) NOT NULL,
	`personId` varchar(36) NOT NULL,
	`propertyId` varchar(36),
	`source` varchar(50),
	`type` enum('appreciation','complaint','observation') NOT NULL,
	`severity` enum('low','medium','high','critical'),
	`description` text NOT NULL,
	`actionTaken` text,
	`reviewedBy` varchar(36),
	`reviewedAt` timestamp,
	`feedbackStatus` enum('open','reviewed','resolved','dismissed') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `id_cards` (
	`id` varchar(36) NOT NULL,
	`personId` varchar(36) NOT NULL,
	`cardNumber` varchar(32) NOT NULL,
	`qrToken` varchar(128) NOT NULL,
	`photoUrl` varchar(512),
	`designation` varchar(150),
	`propertyId` varchar(36),
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
	`id` varchar(36) NOT NULL,
	`propertyId` varchar(36) NOT NULL,
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
	`id` varchar(36) NOT NULL,
	`invoiceNo` varchar(50) NOT NULL,
	`entityId` varchar(36),
	`propertyId` varchar(36) NOT NULL,
	`ownerId` varchar(36) NOT NULL,
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
	`placeOfSupplyStateCode` varchar(2),
	`eInvoiceIrn` varchar(64),
	`eInvoiceAckNo` varchar(32),
	`eInvoiceQrCode` text,
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
	`id` varchar(36) NOT NULL,
	`personId` varchar(36) NOT NULL,
	`policyId` varchar(36) NOT NULL,
	`leaveType` varchar(50) NOT NULL,
	`fromDate` date NOT NULL,
	`toDate` date NOT NULL,
	`days` decimal(4,1) NOT NULL,
	`halfDayStart` boolean DEFAULT false,
	`halfDayEnd` boolean DEFAULT false,
	`reason` text,
	`status` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
	`appliedAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedBy` varchar(36),
	`reviewedAt` timestamp,
	`reviewNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leave_applications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leave_balances` (
	`id` varchar(36) NOT NULL,
	`personId` varchar(36) NOT NULL,
	`policyId` varchar(36) NOT NULL,
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
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`appliesToStaffType` varchar(50),
	`appliesToRoleId` varchar(36),
	`leaveType` enum('casual','sick','earned','unpaid','comp_off','maternity','paternity','bereavement') NOT NULL,
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
CREATE TABLE `magic_links` (
	`id` varchar(36) NOT NULL,
	`userId` varchar(36) NOT NULL,
	`tokenHash` varchar(255) NOT NULL,
	`purpose` enum('login','first_login_setup') NOT NULL DEFAULT 'login',
	`consumedAt` timestamp,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `magic_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `magic_links_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `monthly_reports` (
	`id` varchar(36) NOT NULL,
	`propertyId` varchar(36) NOT NULL,
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
	`id` varchar(36) NOT NULL,
	`recipientId` varchar(36) NOT NULL,
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
	`id` varchar(36) NOT NULL,
	`personId` varchar(36) NOT NULL,
	`items` json,
	`status` enum('in_progress','complete','blocked') NOT NULL DEFAULT 'in_progress',
	`blockerReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `onboarding_checklists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `otp_codes` (
	`id` varchar(36) NOT NULL,
	`identifier` varchar(320) NOT NULL,
	`identifierType` enum('phone','email') NOT NULL,
	`codeHash` varchar(255) NOT NULL,
	`purpose` enum('login','password_reset','phone_verify','email_verify') NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`consumedAt` timestamp,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `otp_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `owners` (
	`id` varchar(36) NOT NULL,
	`userId` varchar(36),
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
	CONSTRAINT `owners_id` PRIMARY KEY(`id`),
	CONSTRAINT `owners_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` varchar(36) NOT NULL,
	`invoiceId` varchar(36) NOT NULL,
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
	`id` varchar(36) NOT NULL,
	`payrollLineId` varchar(36) NOT NULL,
	`personId` varchar(36) NOT NULL,
	`code` enum('ADV','ABS','DMG','DIS','OPS','TAX','STAT','OTHER') NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`reasonNote` text,
	`evidenceUrl` varchar(512),
	`requestedBy` varchar(36),
	`requestedAt` timestamp,
	`approvalStatus` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`approvedBy` varchar(36),
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payroll_deductions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payroll_lines` (
	`id` varchar(36) NOT NULL,
	`payrollRunId` varchar(36) NOT NULL,
	`personId` varchar(36) NOT NULL,
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
	`id` varchar(36) NOT NULL,
	`entityId` varchar(36),
	`cycleMonth` varchar(7) NOT NULL,
	`entity` varchar(255),
	`staffTypes` json,
	`cutoffDate` date,
	`status` enum('draft','locked','finalized','reverted') NOT NULL DEFAULT 'draft',
	`initiatedBy` varchar(36),
	`initiatedAt` timestamp DEFAULT (now()),
	`finalizedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payroll_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `people` (
	`id` varchar(36) NOT NULL,
	`userId` varchar(36),
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
	`employmentType` enum('contract','permanent','probation','trainee'),
	`employmentStatus` enum('active','on_leave','exited','absconding') NOT NULL DEFAULT 'active',
	`abscondingFlaggedAt` timestamp,
	`designation` varchar(150),
	`joiningDate` date,
	`homePropertyId` varchar(36),
	`currentSupervisorId` varchar(36),
	`source` enum('referral','direct','agency','walk_in','social_media'),
	`referrerId` varchar(36),
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
	`id` varchar(36) NOT NULL,
	`personId` varchar(36) NOT NULL,
	`reviewerId` varchar(36) NOT NULL,
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
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`propertyType` enum('villa','second_home','hotel','apartment') NOT NULL,
	`address` text,
	`city` varchar(100),
	`state` varchar(100),
	`pincode` varchar(10),
	`gpsLat` decimal(10,7),
	`gpsLng` decimal(11,7),
	`geofenceRadiusM` int DEFAULT 100,
	`geofenceLenient` boolean NOT NULL DEFAULT false,
	`bedroomCount` int,
	`bathroomCount` int,
	`sqFt` int,
	`amenities` json,
	`roomMap` json,
	`photos` json,
	`primaryOwnerId` varchar(36),
	`assignedPmId` varchar(36),
	`feeStructureId` varchar(36),
	`slaId` varchar(36),
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
	`id` varchar(36) NOT NULL,
	`propertyId` varchar(36) NOT NULL,
	`ownerId` varchar(36) NOT NULL,
	`ownershipPct` decimal(5,2),
	`isPrimary` boolean DEFAULT false,
	`permissions` json,
	CONSTRAINT `property_owners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referrals` (
	`id` varchar(36) NOT NULL,
	`referrerPersonId` varchar(36) NOT NULL,
	`candidateId` varchar(36),
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
CREATE TABLE `refresh_tokens` (
	`id` varchar(36) NOT NULL,
	`userId` varchar(36) NOT NULL,
	`tokenHash` varchar(255) NOT NULL,
	`userAgent` varchar(512),
	`ip` varchar(45),
	`expiresAt` timestamp NOT NULL,
	`revokedAt` timestamp,
	`rotatedToId` varchar(36),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastUsedAt` timestamp,
	CONSTRAINT `refresh_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `refresh_tokens_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `requests` (
	`id` varchar(36) NOT NULL,
	`propertyId` varchar(36) NOT NULL,
	`ownerId` varchar(36) NOT NULL,
	`type` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`requestPriority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`assignedTo` varchar(36),
	`resolvedAt` timestamp,
	`resolution` text,
	`requestStatus` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `requisition_candidates` (
	`id` varchar(36) NOT NULL,
	`requisitionId` varchar(36) NOT NULL,
	`candidateId` varchar(36) NOT NULL,
	`stage` enum('new','screening','interview','offer_extended','offer_accepted','offer_declined','rejected','dropped','hired') NOT NULL DEFAULT 'new',
	`stageChangedAt` timestamp NOT NULL DEFAULT (now()),
	`stageChangedBy` varchar(36),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `requisition_candidates_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_req_candidate` UNIQUE(`requisitionId`,`candidateId`)
);
--> statement-breakpoint
CREATE TABLE `requisitions` (
	`id` varchar(36) NOT NULL,
	`propertyId` varchar(36),
	`roleCode` enum('housekeeping','kitchen','f_and_b','maintenance','security','supervisor','manager','other') NOT NULL,
	`headcount` int NOT NULL DEFAULT 1,
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`raisedBy` varchar(36),
	`targetCloseDate` date,
	`interviewOwnerRole` varchar(50),
	`status` enum('open','in_progress','filled','cancelled') NOT NULL DEFAULT 'open',
	`filledByPersonId` varchar(36),
	`filledAt` timestamp,
	`fillNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `requisitions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `salary_holds` (
	`id` varchar(36) NOT NULL,
	`personId` varchar(36) NOT NULL,
	`payrollLineId` varchar(36),
	`reason` varchar(255) NOT NULL,
	`reasonNote` text,
	`amount` decimal(12,2),
	`appliedBy` varchar(36),
	`appliedAt` timestamp DEFAULT (now()),
	`expiresAt` timestamp,
	`releasedBy` varchar(36),
	`releasedAt` timestamp,
	`releaseNote` text,
	`status` enum('active','released','expired') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `salary_holds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shift_event_edits` (
	`id` varchar(36) NOT NULL,
	`shiftEventId` varchar(36) NOT NULL,
	`editedBy` varchar(36) NOT NULL,
	`editedAt` timestamp NOT NULL DEFAULT (now()),
	`beforeValue` json,
	`afterValue` json,
	`reasonCode` varchar(32) NOT NULL,
	`reasonNote` text,
	`approvedBy` varchar(36),
	`approvedAt` timestamp,
	`approvalStatus` enum('not_required','pending','approved','rejected') NOT NULL DEFAULT 'not_required',
	CONSTRAINT `shift_event_edits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shift_events` (
	`id` varchar(36) NOT NULL,
	`personId` varchar(36) NOT NULL,
	`propertyId` varchar(36),
	`eventType` enum('check_in','break_start','break_end','check_out') NOT NULL,
	`occurredAt` timestamp NOT NULL,
	`markMode` enum('verified_self','supervisor_marked','imported','retro_edit') NOT NULL,
	`markedBy` varchar(36) NOT NULL,
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
	`id` varchar(36) NOT NULL,
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
	`id` varchar(36) NOT NULL,
	`personId` varchar(36) NOT NULL,
	`moduleId` varchar(36) NOT NULL,
	`assignedAt` timestamp DEFAULT (now()),
	`startedAt` timestamp,
	`completedAt` timestamp,
	`signedOffBy` varchar(36),
	`score` int,
	`status` enum('assigned','in_progress','completed','expired') NOT NULL DEFAULT 'assigned',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `training_completions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `training_modules` (
	`id` varchar(36) NOT NULL,
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
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(20),
	`name` varchar(255),
	`role` enum('super_admin','central_admin','ops_lead','supply_lead','finance_admin','property_manager','supervisor','associate','owner_portal') NOT NULL DEFAULT 'associate',
	`permissionOverrides` json,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastSignedInAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`),
	CONSTRAINT `users_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE TABLE `vendors` (
	`id` varchar(36) NOT NULL,
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
	`id` varchar(36) NOT NULL,
	`propertyId` varchar(36) NOT NULL,
	`vendorId` varchar(36) NOT NULL,
	`raisedBy` varchar(36),
	`description` text NOT NULL,
	`quotedAmount` decimal(12,2),
	`scheduledFor` date,
	`completedAt` timestamp,
	`finalAmount` decimal(12,2),
	`rating` int,
	`expenseId` varchar(36),
	`workOrderStatus` enum('raised','accepted','in_progress','completed','cancelled','disputed') NOT NULL DEFAULT 'raised',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `work_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_personId_people_id_fk` FOREIGN KEY (`personId`) REFERENCES `people`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_actorId_users_id_fk` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `auth_credentials` ADD CONSTRAINT `auth_credentials_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `breakages` ADD CONSTRAINT `breakages_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_personId_people_id_fk` FOREIGN KEY (`personId`) REFERENCES `people`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_templateId_contract_templates_id_fk` FOREIGN KEY (`templateId`) REFERENCES `contract_templates`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `daily_checklists` ADD CONSTRAINT `daily_checklists_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exits` ADD CONSTRAINT `exits_personId_people_id_fk` FOREIGN KEY (`personId`) REFERENCES `people`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expenses` ADD CONSTRAINT `expenses_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `feedback` ADD CONSTRAINT `feedback_personId_people_id_fk` FOREIGN KEY (`personId`) REFERENCES `people`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `id_cards` ADD CONSTRAINT `id_cards_personId_people_id_fk` FOREIGN KEY (`personId`) REFERENCES `people`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_entityId_entities_id_fk` FOREIGN KEY (`entityId`) REFERENCES `entities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_ownerId_owners_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `owners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leave_applications` ADD CONSTRAINT `leave_applications_personId_people_id_fk` FOREIGN KEY (`personId`) REFERENCES `people`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leave_applications` ADD CONSTRAINT `leave_applications_policyId_leave_policies_id_fk` FOREIGN KEY (`policyId`) REFERENCES `leave_policies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leave_balances` ADD CONSTRAINT `leave_balances_personId_people_id_fk` FOREIGN KEY (`personId`) REFERENCES `people`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leave_balances` ADD CONSTRAINT `leave_balances_policyId_leave_policies_id_fk` FOREIGN KEY (`policyId`) REFERENCES `leave_policies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `magic_links` ADD CONSTRAINT `magic_links_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monthly_reports` ADD CONSTRAINT `monthly_reports_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `onboarding_checklists` ADD CONSTRAINT `onboarding_checklists_personId_people_id_fk` FOREIGN KEY (`personId`) REFERENCES `people`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `owners` ADD CONSTRAINT `owners_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_invoiceId_invoices_id_fk` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payroll_deductions` ADD CONSTRAINT `payroll_deductions_payrollLineId_payroll_lines_id_fk` FOREIGN KEY (`payrollLineId`) REFERENCES `payroll_lines`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payroll_deductions` ADD CONSTRAINT `payroll_deductions_personId_people_id_fk` FOREIGN KEY (`personId`) REFERENCES `people`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payroll_lines` ADD CONSTRAINT `payroll_lines_payrollRunId_payroll_runs_id_fk` FOREIGN KEY (`payrollRunId`) REFERENCES `payroll_runs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payroll_lines` ADD CONSTRAINT `payroll_lines_personId_people_id_fk` FOREIGN KEY (`personId`) REFERENCES `people`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payroll_runs` ADD CONSTRAINT `payroll_runs_entityId_entities_id_fk` FOREIGN KEY (`entityId`) REFERENCES `entities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `people` ADD CONSTRAINT `people_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `performance_reviews` ADD CONSTRAINT `performance_reviews_personId_people_id_fk` FOREIGN KEY (`personId`) REFERENCES `people`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `property_owners` ADD CONSTRAINT `property_owners_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `property_owners` ADD CONSTRAINT `property_owners_ownerId_owners_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `owners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_referrerPersonId_people_id_fk` FOREIGN KEY (`referrerPersonId`) REFERENCES `people`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `requests` ADD CONSTRAINT `requests_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `requests` ADD CONSTRAINT `requests_ownerId_owners_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `owners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `requisition_candidates` ADD CONSTRAINT `requisition_candidates_requisitionId_requisitions_id_fk` FOREIGN KEY (`requisitionId`) REFERENCES `requisitions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `requisition_candidates` ADD CONSTRAINT `requisition_candidates_candidateId_candidates_id_fk` FOREIGN KEY (`candidateId`) REFERENCES `candidates`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
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
CREATE INDEX `idx_magic_user` ON `magic_links` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_magic_expires` ON `magic_links` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `idx_otp_identifier_purpose` ON `otp_codes` (`identifier`,`purpose`);--> statement-breakpoint
CREATE INDEX `idx_otp_expires` ON `otp_codes` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `idx_people_status` ON `people` (`employmentStatus`);--> statement-breakpoint
CREATE INDEX `idx_people_type` ON `people` (`staffType`);--> statement-breakpoint
CREATE INDEX `idx_people_emp_type` ON `people` (`employmentType`);--> statement-breakpoint
CREATE INDEX `idx_people_property` ON `people` (`homePropertyId`);--> statement-breakpoint
CREATE INDEX `idx_refresh_user` ON `refresh_tokens` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_refresh_expires` ON `refresh_tokens` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `idx_rc_stage` ON `requisition_candidates` (`stage`);--> statement-breakpoint
CREATE INDEX `idx_shift_person_date` ON `shift_events` (`personId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `idx_shift_property_date` ON `shift_events` (`propertyId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `idx_shift_session` ON `shift_events` (`shiftSessionId`);--> statement-breakpoint
CREATE INDEX `idx_users_email` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_users_phone` ON `users` (`phone`);--> statement-breakpoint
CREATE INDEX `idx_users_role` ON `users` (`role`);