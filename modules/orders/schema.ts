import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";
import { contacts } from "@/lib/db/schema/contacts";

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  organizationId: text("organization_id").notNull(),
  contactId: text("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["placed", "paid", "fulfilling", "shipped", "delivered", "refunded"] }).notNull().default("placed"),
  totalCents: integer("total_cents").notNull().default(0),
  placedAt: integer("placed_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  fulfilledAt: integer("fulfilled_at", { mode: "timestamp" }),
  notes: text("notes"),
});

export const orderItems = sqliteTable("order_items", {
  id: text("id").primaryKey().$defaultFn(() => nanoid()),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPriceCents: integer("unit_price_cents").notNull().default(0),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
