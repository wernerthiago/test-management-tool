DROP TABLE `datadogExportedRuns`;--> statement-breakpoint
DROP TABLE `datadogSettings`;--> statement-breakpoint
ALTER TABLE `testExecutions` DROP COLUMN `datadogService`;--> statement-breakpoint
ALTER TABLE `testExecutions` DROP COLUMN `datadogEnvironment`;