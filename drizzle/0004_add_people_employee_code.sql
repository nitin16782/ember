ALTER TABLE `people` ADD `employeeCode` varchar(16);--> statement-breakpoint
ALTER TABLE `people` ADD CONSTRAINT `people_employeeCode_unique` UNIQUE(`employeeCode`);