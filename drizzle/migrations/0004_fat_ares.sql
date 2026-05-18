CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`contact_id` text NOT NULL,
	`plan_name` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`monthly_value_cents` integer DEFAULT 0 NOT NULL,
	`started_at` integer NOT NULL,
	`current_period_end` integer,
	`canceled_at` integer,
	`notes` text,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE cascade
);
