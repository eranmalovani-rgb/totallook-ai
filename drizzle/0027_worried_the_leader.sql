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
