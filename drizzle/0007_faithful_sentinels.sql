CREATE TABLE `habit_streaks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`habitId` int NOT NULL,
	`userId` int NOT NULL,
	`currentStreak` int NOT NULL DEFAULT 0,
	`lastCheckedDate` timestamp,
	`longestStreak` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `habit_streaks_id` PRIMARY KEY(`id`)
);
