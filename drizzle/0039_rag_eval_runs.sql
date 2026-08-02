CREATE TABLE `rag_eval_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runAt` timestamp NOT NULL DEFAULT (now()),
	`runName` varchar(128) NOT NULL,
	`configName` varchar(64) NOT NULL,
	`meanPrecision` float NOT NULL,
	`meanRecall` float NOT NULL,
	`meanMRR` float NOT NULL,
	`meanRelevance` float,
	`meanGroundedness` float,
	`latencyP95` int NOT NULL,
	`configJson` json,
	`queryCount` int NOT NULL DEFAULT 0,
	`errorCount` int NOT NULL DEFAULT 0,
	CONSTRAINT `rag_eval_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `rag_eval_runs_runAt_idx` ON `rag_eval_runs` (`runAt`);--> statement-breakpoint
CREATE INDEX `rag_eval_runs_runName_idx` ON `rag_eval_runs` (`runName`);
