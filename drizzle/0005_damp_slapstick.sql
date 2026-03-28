CREATE TABLE `calendar_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(300) NOT NULL,
	`type` enum('therapy','goal','habit','reminder','other') NOT NULL DEFAULT 'other',
	`eventDate` timestamp NOT NULL,
	`endDate` timestamp,
	`notes` text,
	`color` varchar(20) NOT NULL DEFAULT '#8b5cf6',
	`isAllDay` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `calendar_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `phone` varchar(30);--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `contactEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `therapistName` varchar(200);--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `therapistPhone` varchar(30);--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `therapistEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `therapistNotes` text;