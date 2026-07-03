CREATE TABLE `user_scars` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`scarText` text NOT NULL,
	`category` varchar(100) NOT NULL,
	`vectorEmbedding` json,
	`confidence` float NOT NULL DEFAULT 0.5,
	`sourceType` varchar(50) NOT NULL,
	`sourceId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_scars_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weekly_digests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`weekStartDate` timestamp NOT NULL,
	`digestContent` text NOT NULL,
	`scarsRecalled` json DEFAULT ('[]'),
	`strategy` varchar(50) NOT NULL,
	`personalizationScore` float DEFAULT 0,
	`passedProofGates` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `weekly_digests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `trialStartDate` timestamp;