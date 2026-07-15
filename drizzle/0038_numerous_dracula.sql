CREATE TABLE `echo_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sourceEntryId` int NOT NULL,
	`triggerEntryId` int NOT NULL,
	`score` float NOT NULL,
	`reframingLine` text NOT NULL,
	`surfacedAt` timestamp,
	`dismissedAt` timestamp,
	`reflectedAt` timestamp,
	`isCompound` boolean NOT NULL DEFAULT false,
	`compoundEntryIds` json DEFAULT ('[]'),
	`challengeText` text,
	`challengeCategory` varchar(50),
	`challengeAcceptedAt` timestamp,
	`challengeCompletedAt` timestamp,
	`challengeReflection` text,
	`challengeSkippedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `echo_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `daily_check_ins` ADD `reflectionTheme` varchar(50);--> statement-breakpoint
ALTER TABLE `journal_entries` ADD `primaryEmotion` varchar(50);--> statement-breakpoint
ALTER TABLE `journal_entries` ADD `themeTags` json DEFAULT ('[]');--> statement-breakpoint
ALTER TABLE `journal_entries` ADD `tensionSummary` text;--> statement-breakpoint
ALTER TABLE `journal_entries` ADD `resolutionStatus` enum('open','resolved','unclear') DEFAULT 'unclear';--> statement-breakpoint
ALTER TABLE `journal_entries` ADD `intensityScore` int;--> statement-breakpoint
ALTER TABLE `program_lessons` ADD `isVoiceDay` boolean DEFAULT false;