CREATE TABLE `feedComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`feedPostId` int NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`parentId` int,
	`userName` varchar(256),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feedComments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `wardrobeShareToken` varchar(64);