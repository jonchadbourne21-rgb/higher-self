ALTER TABLE `time_capsule_letters` ADD `driftScoreSnapshot` float;--> statement-breakpoint
ALTER TABLE `time_capsule_letters` ADD `valenceSnapshot` json;--> statement-breakpoint
ALTER TABLE `time_capsule_letters` ADD `sessionStartedWithin48h` boolean;--> statement-breakpoint
ALTER TABLE `time_capsule_letters` ADD `firstSessionAfterDelivery` timestamp;--> statement-breakpoint
ALTER TABLE `time_capsule_letters` ADD `accountabilityQuestion` text;