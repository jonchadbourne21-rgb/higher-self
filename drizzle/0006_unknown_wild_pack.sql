ALTER TABLE `calendar_events` ADD `recurrence` enum('none','weekly','monthly') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `calendar_events` ADD `recurrenceEnd` timestamp;