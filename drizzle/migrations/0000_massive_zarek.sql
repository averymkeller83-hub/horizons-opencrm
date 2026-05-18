CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`company` text,
	`notes` text,
	`tags` text DEFAULT '[]',
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `interactions` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`type` text NOT NULL,
	`direction` text,
	`summary` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE cascade
);
