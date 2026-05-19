import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";

export const campaigns = sqliteTable("campaigns", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  organizationId: text("organization_id").notNull(),
  name: text("name").notNull(),
  type: text("type", { enum: ["paid_ad", "referral", "cold_email", "event", "content", "partnership", "other"] }).notNull().default("other"),
  status: text("status", { enum: ["active", "paused", "completed", "archived"] }).notNull().default("active"),
  budgetCents: integer("budget_cents").notNull().default(0),
  startDate: integer("start_date", { mode: "timestamp" }),
  endDate: integer("end_date", { mode: "timestamp" }),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;
