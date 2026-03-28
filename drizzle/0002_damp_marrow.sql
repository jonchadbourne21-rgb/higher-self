CREATE TABLE `growth_programs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`description` text,
	`durationDays` int NOT NULL,
	`category` enum('emotional-mastery','building-presence','relationships','mindfulness') NOT NULL,
	`status` enum('active','archived') DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `growth_programs_id` PRIMARY KEY(`id`),
	CONSTRAINT `growth_programs_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `program_lessons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`programId` int NOT NULL,
	`day` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`concept` text NOT NULL,
	`exercisePrompt` text NOT NULL,
	`guidanceTemplate` text,
	`order` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `program_lessons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_lesson_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`programId` int NOT NULL,
	`lessonId` int NOT NULL,
	`day` int NOT NULL,
	`userReflection` text NOT NULL,
	`aiFeedback` text,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_lesson_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_program_enrollments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`programId` int NOT NULL,
	`enrolledAt` timestamp NOT NULL DEFAULT (now()),
	`startedAt` timestamp,
	`completedAt` timestamp,
	`status` enum('enrolled','in_progress','completed','paused') DEFAULT 'enrolled',
	`currentDay` int DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_program_enrollments_id` PRIMARY KEY(`id`)
);
