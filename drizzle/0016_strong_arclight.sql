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
