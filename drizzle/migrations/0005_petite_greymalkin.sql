CREATE TABLE `support_tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`contact_id` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`sla_due_at` integer,
	`resolved_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE cascade
);
