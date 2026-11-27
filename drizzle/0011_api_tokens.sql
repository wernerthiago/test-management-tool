CREATE TABLE `apiTokens` (
	`id` varchar(64) NOT NULL,
	`projectId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`tokenHash` varchar(64) NOT NULL,
	`tokenPrefix` varchar(16) NOT NULL,
	`createdBy` varchar(64) NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	`lastUsedAt` timestamp,
	CONSTRAINT `apiTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `apiTokens_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE INDEX `project_idx` ON `apiTokens` (`projectId`);