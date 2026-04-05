CREATE TABLE `fixMyLookResults` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reviewId` int NOT NULL,
	`userId` int NOT NULL,
	`fixedImageUrl` text NOT NULL,
	`originalScore` int NOT NULL,
	`estimatedScore` int NOT NULL,
	`itemsFixed` json,
	`shoppingLinks` json,
	`itemIndices` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fixMyLookResults_id` PRIMARY KEY(`id`)
);
