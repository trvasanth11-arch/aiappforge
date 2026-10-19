CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int,
	`actorId` int NOT NULL,
	`action` varchar(96) NOT NULL,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `previewRuns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`ownerId` int NOT NULL,
	`versionId` int,
	`status` enum('queued','building','ready','failed') NOT NULL DEFAULT 'queued',
	`logs` text NOT NULL,
	`routeMap` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `previewRuns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','editor','viewer') NOT NULL DEFAULT 'viewer',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `projectMembers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `usageCounters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`key` varchar(64) NOT NULL,
	`count` int NOT NULL DEFAULT 0,
	`periodStart` timestamp NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `usageCounters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `bugReports` ADD `patch` text;--> statement-breakpoint
ALTER TABLE `bugReports` ADD `affectedFiles` text;--> statement-breakpoint
ALTER TABLE `projectVersions` ADD `snapshot` text;