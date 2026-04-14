CREATE TABLE `saved_insights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`chatMessageId` int,
	`content` text NOT NULL,
	`reactionType` enum('heart','star') NOT NULL,
	`note` text,
	`savedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `saved_insights_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `seedIntent` varchar(100);