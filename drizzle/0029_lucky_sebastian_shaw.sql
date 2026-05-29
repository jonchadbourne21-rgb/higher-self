CREATE TABLE `memory_embeddings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sourceType` enum('journal','chat','voice','checkin','program_response') NOT NULL,
	`sourceId` int,
	`content` text NOT NULL,
	`embedding` json NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `memory_embeddings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_personality_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`traits` json DEFAULT ('[]'),
	`communicationStyle` text,
	`emotionalPatterns` text,
	`recurringThemes` json DEFAULT ('[]'),
	`growthEdges` json DEFAULT ('[]'),
	`challengeStyle` text,
	`lastAnalyzedAt` timestamp,
	`interactionCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_personality_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `voice_usage_monthly` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`usageMonth` varchar(7) NOT NULL,
	`responseCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `voice_usage_monthly_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `subscriptions` MODIFY COLUMN `tier` enum('free','pro','pro_voice') NOT NULL DEFAULT 'free';