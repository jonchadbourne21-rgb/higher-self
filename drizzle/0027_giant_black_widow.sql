CREATE TABLE `v2v_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`transcript` text NOT NULL,
	`emotion1Name` varchar(64),
	`emotion1Score` float,
	`emotion2Name` varchar(64),
	`emotion2Score` float,
	`emotion3Name` varchar(64),
	`emotion3Score` float,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `v2v_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `v2v_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionUuid` varchar(36) NOT NULL,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`endedAt` timestamp,
	CONSTRAINT `v2v_sessions_id` PRIMARY KEY(`id`)
);
