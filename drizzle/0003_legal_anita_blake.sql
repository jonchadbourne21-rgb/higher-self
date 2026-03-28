CREATE TABLE `journal_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`color` varchar(20) NOT NULL DEFAULT '#8b5cf6',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `journal_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `journal_entries` ADD `categoryId` int;