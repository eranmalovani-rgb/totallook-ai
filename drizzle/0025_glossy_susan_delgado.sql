ALTER TABLE `guestSessions` ADD `source` varchar(32) DEFAULT 'web';--> statement-breakpoint
ALTER TABLE `guestSessions` ADD `whatsappToken` varchar(64);--> statement-breakpoint
ALTER TABLE `guestSessions` ADD `whatsappPhone` varchar(32);--> statement-breakpoint
ALTER TABLE `guestSessions` ADD `whatsappProfileName` varchar(256);