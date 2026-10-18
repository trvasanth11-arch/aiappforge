CREATE TABLE `bugReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`ownerId` int NOT NULL,
	`errorLog` text NOT NULL,
	`diagnosis` text,
	`status` enum('open','analyzing','fixed','blocked') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bugReports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `builds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`ownerId` int NOT NULL,
	`kind` enum('web','apk','aab') NOT NULL,
	`status` enum('queued','building','ready','blocked') NOT NULL DEFAULT 'queued',
	`packageName` varchar(180),
	`version` varchar(32),
	`artifactUrl` varchar(512),
	`blocker` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `builds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `domains` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`ownerId` int NOT NULL,
	`hostname` varchar(255) NOT NULL,
	`status` enum('pending','verifying','connected','blocked') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `domains_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`ownerId` int NOT NULL,
	`kind` varchar(48) NOT NULL,
	`message` text NOT NULL,
	`meta` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `projectEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`idea` text NOT NULL,
	`description` text,
	`status` enum('draft','building','ready','blocked') NOT NULL DEFAULT 'draft',
	`blueprint` text,
	`previewPath` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(80) NOT NULL,
	`name` varchar(120) NOT NULL,
	`category` varchar(80) NOT NULL,
	`description` text NOT NULL,
	`accent` varchar(24) NOT NULL,
	`icon` varchar(32) NOT NULL,
	`popularity` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `templates_slug_unique` UNIQUE(`slug`)
);
