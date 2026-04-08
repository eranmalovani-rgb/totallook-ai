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
CREATE TABLE `feedPosts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`reviewId` int NOT NULL,
	`caption` text,
	`userName` varchar(256),
	`gender` varchar(32),
	`styleTags` text,
	`occasion` varchar(64),
	`imageUrl` text NOT NULL,
	`overallScore` int,
	`summary` text,
	`likesCount` int NOT NULL DEFAULT 0,
	`savesCount` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feedPosts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE `follows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`followerId` int NOT NULL,
	`followedId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `follows_id` PRIMARY KEY(`id`)
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
	`ageRange` varchar(16),
	`gender` varchar(32),
	`occupation` varchar(64),
	`budgetLevel` varchar(32),
	`stylePreference` text,
	`favoriteBrands` text,
	`favoriteInfluencers` text,
	`preferredStores` text,
	`country` varchar(8),
	`onboardingCompleted` int NOT NULL DEFAULT 0,
	`email` varchar(320),
	`analysisCount` int NOT NULL DEFAULT 0,
	`source` varchar(32) DEFAULT 'web',
	`whatsappToken` varchar(64),
	`whatsappPhone` varchar(32),
	`whatsappProfileName` varchar(256),
	`lastViewedAt` timestamp,
	`followUpSentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `guestSessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
CREATE TABLE `likes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`postId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `likes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(32) NOT NULL,
	`actorId` int NOT NULL,
	`actorName` varchar(256),
	`postId` int,
	`isRead` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pageViews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fingerprint` varchar(128) NOT NULL,
	`page` varchar(256) NOT NULL,
	`referrer` text,
	`userAgent` text,
	`ipAddress` varchar(64),
	`screenWidth` int,
	`country` varchar(8),
	`convertedUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pageViews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `privacy_consents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`guestSessionId` varchar(128),
	`consentType` varchar(64) NOT NULL,
	`granted` int NOT NULL DEFAULT 0,
	`ipHash` varchar(64),
	`userAgent` text,
	`documentVersion` varchar(32) NOT NULL DEFAULT '1.0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `privacy_consents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `productImageCache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productKey` varchar(512) NOT NULL,
	`imageUrl` text NOT NULL,
	`originalLabel` text,
	`categoryQuery` varchar(256),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `productImageCache_id` PRIMARY KEY(`id`),
	CONSTRAINT `productImageCache_productKey_unique` UNIQUE(`productKey`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`imageUrl` text NOT NULL,
	`imageKey` varchar(512) NOT NULL,
	`status` enum('pending','analyzing','completed','failed') NOT NULL DEFAULT 'pending',
	`influencers` text,
	`styleNotes` text,
	`occasion` varchar(64),
	`overallScore` int,
	`analysisJson` json,
	`secondImageUrl` text,
	`secondImageKey` varchar(512),
	`shareToken` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saves` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`postId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `saves_id` PRIMARY KEY(`id`)
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
--> statement-breakpoint
CREATE TABLE `userProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`ageRange` varchar(16),
	`gender` varchar(32),
	`occupation` varchar(64),
	`budgetLevel` varchar(32),
	`stylePreference` text,
	`favoriteBrands` text,
	`favoriteInfluencers` text,
	`phoneNumber` varchar(32),
	`instagramHandle` varchar(128),
	`instagramInfluencers` json,
	`preferredStores` text,
	`saveToWardrobe` int NOT NULL DEFAULT 1,
	`wardrobeShareToken` varchar(64),
	`country` varchar(8),
	`onboardingCompleted` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `userProfiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `wardrobeItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`guestSessionId` int,
	`itemType` varchar(64) NOT NULL,
	`name` text NOT NULL,
	`color` varchar(64),
	`brand` varchar(128),
	`material` varchar(128),
	`styleNote` varchar(512),
	`score` int,
	`sourceImageUrl` text,
	`sourceReviewId` int,
	`verdict` varchar(128),
	`itemImageUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wardrobeItems_id` PRIMARY KEY(`id`)
);
