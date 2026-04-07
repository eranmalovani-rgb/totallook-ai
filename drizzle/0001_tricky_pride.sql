CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`imageUrl` text NOT NULL,
	`imageKey` varchar(512) NOT NULL,
	`status` enum('pending','analyzing','completed','failed') NOT NULL DEFAULT 'pending',
	`overallScore` int,
	`analysisJson` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
