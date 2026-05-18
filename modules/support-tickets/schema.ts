import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";
import { contacts } from "@/lib/db/schema/contacts";

export const supportTickets = sqliteTable("support_tickets", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  organizationId: text("organization_id").notNull(),
  contactId: text("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status", { enum: ["new", "in_progress", "waiting_on_customer", "resolved", "closed"] }).notNull().default("new"),
  priority: text("priority", { enum: ["low", "medium", "high", "urgent"] }).notNull().default("medium"),
  slaDueAt: integer("sla_due_at", { mode: "timestamp" }),
  resolvedAt: integer("resolved_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type SupportTicket = typeof supportTickets.$inferSelect;
export type NewSupportTicket = typeof supportTickets.$inferInsert;
