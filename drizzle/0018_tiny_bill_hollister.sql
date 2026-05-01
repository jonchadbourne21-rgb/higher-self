CREATE TABLE `crisis_incidents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`userMessage` text NOT NULL,
	`detectedKeywords` json NOT NULL,
	`killSwitchResponse` text NOT NULL,
	`userAcknowledged` boolean NOT NULL DEFAULT false,
	`acknowledgedAt` timestamp,
	`followUpMessage` text,
	`severity` enum('low','medium','high') NOT NULL DEFAULT 'low',
	`escalationTriggered` boolean NOT NULL DEFAULT false,
	`escalationDetails` json,
	`incidentAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crisis_incidents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `crisis_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`crisisIncidentId` int NOT NULL,
	`emergencyContactId` int NOT NULL,
	`method` enum('sms','email') NOT NULL,
	`status` enum('pending','sent','failed','delivered') NOT NULL DEFAULT 'pending',
	`message` text NOT NULL,
	`errorMessage` text,
	`sentAt` timestamp,
	`deliveredAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crisis_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emergency_contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`type` enum('family','friend','therapist','counselor','other') NOT NULL,
	`phone` varchar(20),
	`email` varchar(320),
	`notifyOnCrisis` boolean NOT NULL DEFAULT false,
	`notificationMethod` enum('sms','email','both') NOT NULL DEFAULT 'email',
	`consentGiven` boolean NOT NULL DEFAULT false,
	`consentGivenAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emergency_contacts_id` PRIMARY KEY(`id`)
);
