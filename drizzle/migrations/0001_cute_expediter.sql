CREATE TABLE `deals` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`contact_id` text NOT NULL,
	`stage_id` text NOT NULL,
	`title` text NOT NULL,
	`value_cents` integer DEFAULT 0 NOT NULL,
	`probability` integer DEFAULT 50,
	`expected_close_at` integer,
	`closed_at` integer,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`stage_id`) REFERENCES `pipeline_stages`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `pipeline_stages` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`order` integer NOT NULL,
	`is_won` integer DEFAULT false NOT NULL,
	`is_lost` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
