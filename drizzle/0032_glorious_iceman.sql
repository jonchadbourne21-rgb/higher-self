CREATE TABLE `linguistic_drift` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`weekStart` timestamp NOT NULL,
	`driftScore` float NOT NULL,
	`retiredWords` json NOT NULL,
	`newWords` json NOT NULL,
	`currentVocabulary` json NOT NULL,
	`goalSnapshot` text,
	`sessionsAnalyzed` int NOT NULL,
	`analysisMeta` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `linguistic_drift_id` PRIMARY KEY(`id`)
);
