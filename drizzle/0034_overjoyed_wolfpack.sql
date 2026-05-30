CREATE TABLE `entropy_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`score` float NOT NULL,
	`daysSinceCheckin` int NOT NULL,
	`daysSinceCheckinScore` float NOT NULL,
	`journalTrendScore` float NOT NULL,
	`habitCompletionRate` float NOT NULL,
	`habitCompletionScore` float NOT NULL,
	`prosodyEnergyScore` float NOT NULL,
	`triggered` boolean NOT NULL DEFAULT false,
	`consecutiveDaysAbove` int NOT NULL DEFAULT 0,
	`scoreDate` varchar(10) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `entropy_scores_id` PRIMARY KEY(`id`)
);
