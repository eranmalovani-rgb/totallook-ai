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
