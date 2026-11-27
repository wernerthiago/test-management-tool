CREATE TABLE `testCaseAuditLog` (
	`id` varchar(64) NOT NULL,
	`testCaseId` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`action` varchar(50) NOT NULL,
	`fieldName` varchar(100),
	`oldValue` text,
	`newValue` text,
	`timestamp` timestamp DEFAULT (now()),
	CONSTRAINT `testCaseAuditLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `testcase_idx` ON `testCaseAuditLog` (`testCaseId`);--> statement-breakpoint
CREATE INDEX `timestamp_idx` ON `testCaseAuditLog` (`timestamp`);