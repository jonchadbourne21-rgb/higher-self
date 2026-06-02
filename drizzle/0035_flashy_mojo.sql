CREATE TABLE `higher_self_voicemails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`transcript` text NOT NULL,
	`audioUrl` varchar(500),
	`entropyScore` float NOT NULL,
	`wasAnswered` boolean NOT NULL DEFAULT false,
	`listenedAt` timestamp,
	`status` enum('pending_generation','ready','failed') NOT NULL DEFAULT 'pending_generation',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `higher_self_voicemails_id` PRIMARY KEY(`id`)
);
