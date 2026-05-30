CREATE TABLE `session_fingerprints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionId` varchar(36) NOT NULL,
	`sourceType` enum('chat','checkin') NOT NULL,
	`emotionalValence` float NOT NULL,
	`selfBelief` text NOT NULL,
	`unresolvedTension` text NOT NULL,
	`extractionMeta` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `session_fingerprints_id` PRIMARY KEY(`id`)
);
