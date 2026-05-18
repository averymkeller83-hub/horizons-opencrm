import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";
import { contacts } from "@/lib/db/schema/contacts";

export const subscriptions = sqliteTable("subscriptions", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  organizationId: text("organization_id").notNull(),
  contactId: text("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  planName: text("plan_name").notNull(),
  status: text("status", { enum: ["active", "past_due", "canceled", "expired"] }).notNull().default("active"),
  monthlyValueCents: integer("monthly_value_cents").notNull().default(0),
  startedAt: integer("started_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  currentPeriodEnd: integer("current_period_end", { mode: "timestamp" }),
  canceledAt: integer("canceled_at", { mode: "timestamp" }),
  notes: text("notes"),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
