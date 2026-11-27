CREATE TABLE `datadogExportedRuns` (
	`id` varchar(64) NOT NULL,
	`testRunId` varchar(64) NOT NULL,
	`projectId` varchar(64) NOT NULL,
	`exportedBy` varchar(64) NOT NULL,
	`exportedAt` timestamp DEFAULT (now()),
	CONSTRAINT `datadogExportedRuns_id` PRIMARY KEY(`id`),
	CONSTRAINT `datadogExportedRuns_testRunId_unique` UNIQUE(`testRunId`)
);
--> statement-breakpoint
CREATE TABLE `datadogSettings` (
	`id` varchar(64) NOT NULL,
	`projectId` varchar(64) NOT NULL,
	`services` text,
	`environments` text,
	`repositoryName` varchar(255),
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `datadogSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `datadogSettings_projectId_unique` UNIQUE(`projectId`)
);
--> statement-breakpoint
ALTER TABLE `testExecutions` ADD `datadogService` varchar(255);--> statement-breakpoint
ALTER TABLE `testExecutions` ADD `datadogEnvironment` varchar(255);--> statement-breakpoint
CREATE INDEX `testrun_idx` ON `datadogExportedRuns` (`testRunId`);--> statement-breakpoint
CREATE INDEX `project_idx` ON `datadogExportedRuns` (`projectId`);--> statement-breakpoint
CREATE INDEX `project_idx` ON `datadogSettings` (`projectId`);