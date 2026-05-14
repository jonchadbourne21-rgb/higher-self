ALTER TABLE `wheel_spins` MODIFY COLUMN `result` enum('month_pro','dare','try_again','week_trial','reward_points') NOT NULL;--> statement-breakpoint
ALTER TABLE `daily_check_ins` ADD `reflectionPrompt` text;--> statement-breakpoint
ALTER TABLE `daily_check_ins` ADD `reflectionAnswer` text;--> statement-breakpoint
ALTER TABLE `daily_check_ins` ADD `followUpQuestion` text;--> statement-breakpoint
ALTER TABLE `daily_check_ins` ADD `followUpAnswer` text;--> statement-breakpoint
ALTER TABLE `users` ADD `lastStreakSpinDate` date;