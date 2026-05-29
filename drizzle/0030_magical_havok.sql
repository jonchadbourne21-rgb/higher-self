CREATE TABLE `psychological_fingerprints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionType` enum('chat','voice','checkin','program') NOT NULL,
	`sessionId` varchar(255),
	`emotionalTone` varchar(500) NOT NULL,
	`coreBelief` text NOT NULL,
	`unresolvedTension` text NOT NULL,
	`rawExcerpts` json NOT NULL,
	`aspirationalSelf` text,
	`extractedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `psychological_fingerprints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `time_capsule_letters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`letterContent` text NOT NULL,
	`fingerprintIds` json NOT NULL,
	`status` enum('pending','delivered','read') NOT NULL DEFAULT 'pending',
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`deliveredAt` timestamp,
	`readAt` timestamp,
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	CONSTRAINT `time_capsule_letters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `time_capsule_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`cadenceDays` int NOT NULL DEFAULT 30,
	`isEnabled` boolean NOT NULL DEFAULT true,
	`nextDeliveryAt` timestamp,
	`scheduleCronTaskUid` varchar(65),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `time_capsule_settings_id` PRIMARY KEY(`id`)
);
