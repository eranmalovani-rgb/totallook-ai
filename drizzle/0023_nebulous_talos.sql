CREATE TABLE `igConnections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`igUserId` varchar(64) NOT NULL,
	`igUsername` varchar(128),
	`accessToken` text NOT NULL,
	`tokenExpiresAt` timestamp,
	`isActive` int NOT NULL DEFAULT 1,
	`connectedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `igConnections_id` PRIMARY KEY(`id`),
	CONSTRAINT `igConnections_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `storyMentions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`igUserId` varchar(64) NOT NULL,
	`igUsername` varchar(128),
	`igMediaId` varchar(128),
	`mediaUrl` text,
	`savedImageUrl` text,
	`savedImageKey` varchar(512),
	`status` enum('received','fetching','analyzing','completed','failed','dm_sent') NOT NULL DEFAULT 'received',
	`overallScore` int,
	`analysisJson` json,
	`quickSummary` text,
	`quickTip` text,
	`itemsDetected` int DEFAULT 0,
	`dmSent` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`linkedReviewId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `storyMentions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `styleDiaryEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`periodType` varchar(16) NOT NULL,
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`lookCount` int NOT NULL DEFAULT 0,
	`avgScore` int,
	`bestScore` int,
	`bestLookDate` timestamp,
	`bestLookImageUrl` text,
	`topItemTypes` json,
	`topColors` json,
	`styleTrend` text,
	`evolutionInsight` text,
	`scoreTrend` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `styleDiaryEntries_id` PRIMARY KEY(`id`)
);
