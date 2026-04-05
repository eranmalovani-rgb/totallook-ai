CREATE TABLE `wardrobeItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`itemType` varchar(64) NOT NULL,
	`name` text NOT NULL,
	`color` varchar(64),
	`brand` varchar(128),
	`material` varchar(128),
	`score` int,
	`sourceImageUrl` text,
	`sourceReviewId` int,
	`verdict` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wardrobeItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `saveToWardrobe` int DEFAULT 1 NOT NULL;