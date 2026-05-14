CREATE TABLE `reward_grants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`grantType` varchar(50) NOT NULL,
	`label` varchar(200) NOT NULL,
	`durationDays` int NOT NULL,
	`source` varchar(50) NOT NULL,
	`status` enum('pending','active','expired','used') NOT NULL DEFAULT 'pending',
	`activatedAt` timestamp,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reward_grants_id` PRIMARY KEY(`id`)
);
