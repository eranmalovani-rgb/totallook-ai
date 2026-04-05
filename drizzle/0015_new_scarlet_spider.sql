CREATE TABLE `demoViews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fingerprint` varchar(128) NOT NULL,
	`ipAddress` varchar(64),
	`section` varchar(64) NOT NULL DEFAULT 'full',
	`clickedSignup` int NOT NULL DEFAULT 0,
	`userAgent` text,
	`convertedUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `demoViews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `guestSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fingerprint` varchar(128) NOT NULL,
	`ipAddress` varchar(64),
	`imageUrl` text,
	`imageKey` varchar(512),
	`status` enum('pending','analyzing','completed','failed') NOT NULL DEFAULT 'pending',
	`analysisJson` json,
	`overallScore` int,
	`userAgent` text,
	`convertedUserId` int,
	`convertedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `guestSessions_id` PRIMARY KEY(`id`)
);
