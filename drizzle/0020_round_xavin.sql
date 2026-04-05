ALTER TABLE `guestSessions` ADD `ageRange` varchar(16);--> statement-breakpoint
ALTER TABLE `guestSessions` ADD `gender` varchar(32);--> statement-breakpoint
ALTER TABLE `guestSessions` ADD `occupation` varchar(64);--> statement-breakpoint
ALTER TABLE `guestSessions` ADD `budgetLevel` varchar(32);--> statement-breakpoint
ALTER TABLE `guestSessions` ADD `stylePreference` text;--> statement-breakpoint
ALTER TABLE `guestSessions` ADD `favoriteBrands` text;--> statement-breakpoint
ALTER TABLE `guestSessions` ADD `favoriteInfluencers` text;--> statement-breakpoint
ALTER TABLE `guestSessions` ADD `preferredStores` text;--> statement-breakpoint
ALTER TABLE `guestSessions` ADD `country` varchar(8);--> statement-breakpoint
ALTER TABLE `guestSessions` ADD `onboardingCompleted` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `guestSessions` ADD `email` varchar(320);--> statement-breakpoint
ALTER TABLE `guestSessions` ADD `analysisCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `wardrobeItems` ADD `guestSessionId` int;