CREATE TABLE `projectFiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`ownerId` int NOT NULL,
	`path` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`kind` varchar(32) NOT NULL DEFAULT 'source',
	`version` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectFiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`ownerId` int NOT NULL,
	`label` varchar(160) NOT NULL,
	`summary` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `projectVersions_id` PRIMARY KEY(`id`)
);
