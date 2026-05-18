import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";
import { contacts } from "./contacts";

export const interactions = sqliteTable("interactions", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  contactId: text("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").notNull(),
  type: text("type", { enum: ["call", "email", "message", "meeting", "note"] }).notNull(),
  direction: text("direction", { enum: ["inbound", "outbound", "internal"] }),
  summary: text("summary").notNull(),
  occurredAt: integer("occurred_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type Interaction = typeof interactions.$inferSelect;
export type NewInteraction = typeof interactions.$inferInsert;
