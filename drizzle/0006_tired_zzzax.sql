CREATE TABLE `invites` (
	`id` varchar(64) NOT NULL,
	`email` varchar(320) NOT NULL,
	`token` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdBy` varchar(64) NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	`usedAt` timestamp,
	`usedBy` varchar(64),
	CONSTRAINT `invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `invites_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `projectMembers` (
	`id` varchar(64) NOT NULL,
	`projectId` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`role` enum('viewer','editor','admin') NOT NULL DEFAULT 'editor',
	`addedBy` varchar(64) NOT NULL,
	`addedAt` timestamp DEFAULT (now()),
	CONSTRAINT `projectMembers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `authType` enum('oauth','email') DEFAULT 'oauth' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `emailVerified` boolean DEFAULT false;--> statement-breakpoint
CREATE INDEX `token_idx` ON `invites` (`token`);--> statement-breakpoint
CREATE INDEX `expires_at_idx` ON `invites` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `project_idx` ON `projectMembers` (`projectId`);--> statement-breakpoint
CREATE INDEX `user_idx` ON `projectMembers` (`userId`);--> statement-breakpoint
CREATE INDEX `unique_project_user` ON `projectMembers` (`projectId`,`userId`);