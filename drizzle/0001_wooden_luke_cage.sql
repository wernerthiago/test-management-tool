CREATE TABLE `customFields` (
	`id` varchar(64) NOT NULL,
	`projectId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`fieldType` enum('text','number','dropdown','multiselect','date','checkbox') NOT NULL,
	`options` text,
	`isRequired` boolean DEFAULT false,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `customFields_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `folders` (
	`id` varchar(64) NOT NULL,
	`projectId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`parentId` varchar(64),
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `folders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gherkinScenarios` (
	`id` varchar(64) NOT NULL,
	`testCaseId` varchar(64) NOT NULL,
	`feature` text,
	`scenario` text NOT NULL,
	`given` text,
	`when` text,
	`then` text,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `gherkinScenarios_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`createdBy` varchar(64) NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `testCaseCustomFieldValues` (
	`id` varchar(64) NOT NULL,
	`testCaseId` varchar(64) NOT NULL,
	`customFieldId` varchar(64) NOT NULL,
	`value` text NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `testCaseCustomFieldValues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `testCases` (
	`id` varchar(64) NOT NULL,
	`projectId` varchar(64) NOT NULL,
	`folderId` varchar(64),
	`title` varchar(500) NOT NULL,
	`description` text,
	`preconditions` text,
	`testType` enum('manual','automated') NOT NULL DEFAULT 'manual',
	`priority` enum('low','medium','high','critical') DEFAULT 'medium',
	`createdBy` varchar(64) NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `testCases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `testExecutions` (
	`id` varchar(64) NOT NULL,
	`testRunId` varchar(64) NOT NULL,
	`testCaseId` varchar(64) NOT NULL,
	`status` enum('not_run','passed','failed','blocked','skipped') NOT NULL DEFAULT 'not_run',
	`executedBy` varchar(64),
	`executedAt` timestamp,
	`duration` int,
	`comment` text,
	`errorMessage` text,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `testExecutions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `testRuns` (
	`id` varchar(64) NOT NULL,
	`projectId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`createdBy` varchar(64) NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `testRuns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `testSteps` (
	`id` varchar(64) NOT NULL,
	`testCaseId` varchar(64) NOT NULL,
	`stepNumber` int NOT NULL,
	`action` text NOT NULL,
	`expectedResult` text,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `testSteps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `project_idx` ON `customFields` (`projectId`);--> statement-breakpoint
CREATE INDEX `project_idx` ON `folders` (`projectId`);--> statement-breakpoint
CREATE INDEX `parent_idx` ON `folders` (`parentId`);--> statement-breakpoint
CREATE INDEX `testcase_idx` ON `gherkinScenarios` (`testCaseId`);--> statement-breakpoint
CREATE INDEX `testcase_idx` ON `testCaseCustomFieldValues` (`testCaseId`);--> statement-breakpoint
CREATE INDEX `customfield_idx` ON `testCaseCustomFieldValues` (`customFieldId`);--> statement-breakpoint
CREATE INDEX `project_idx` ON `testCases` (`projectId`);--> statement-breakpoint
CREATE INDEX `folder_idx` ON `testCases` (`folderId`);--> statement-breakpoint
CREATE INDEX `testrun_idx` ON `testExecutions` (`testRunId`);--> statement-breakpoint
CREATE INDEX `testcase_idx` ON `testExecutions` (`testCaseId`);--> statement-breakpoint
CREATE INDEX `project_idx` ON `testRuns` (`projectId`);--> statement-breakpoint
CREATE INDEX `testcase_idx` ON `testSteps` (`testCaseId`);