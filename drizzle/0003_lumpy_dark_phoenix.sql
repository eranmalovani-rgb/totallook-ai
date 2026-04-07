CREATE TABLE `userProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`ageRange` varchar(16),
	`gender` varchar(32),
	`occupation` varchar(64),
	`budgetLevel` varchar(32),
	`stylePreference` varchar(64),
	`favoriteBrands` text,
	`favoriteInfluencers` text,
	`instagramHandle` varchar(128),
	`instagramInfluencers` json,
	`onboardingCompleted` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `userProfiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `reviews` ADD `occasion` varchar(64);