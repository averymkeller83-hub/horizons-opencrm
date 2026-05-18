import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { orders, orderItems, type Order, type OrderItem } from "./schema";
import { requireOrg } from "@/lib/clerk";

export type OrdersSummary = { openCount: number; fulfilling: number; paidThisMonthCents: number };

export async function getOrdersSummary(): Promise<OrdersSummary> {
  const orgId = await requireOrg();
  const all = db.select().from(orders).where(eq(orders.organizationId, orgId)).all();
  const open = all.filter((o) => o.status === "placed" || o.status === "paid" || o.status === "fulfilling");
  const fulfilling = all.filter((o) => o.status === "fulfilling").length;
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const paidThisMonth = all
    .filter((o) => (o.status === "paid" || o.status === "shipped" || o.status === "delivered") && o.placedAt >= startOfMonth)
    .reduce((acc, o) => acc + o.totalCents, 0);
  return { openCount: open.length, fulfilling, paidThisMonthCents: paidThisMonth };
}

export async function listOrders(): Promise<Order[]> {
  const orgId = await requireOrg();
  return db.select().from(orders).where(eq(orders.organizationId, orgId)).all();
}

export async function getOrderWithItems(orderId: string): Promise<{ order: Order; items: OrderItem[] } | null> {
  const orgId = await requireOrg();
  const order = db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order || order.organizationId !== orgId) return null;
  const items = db.select().from(orderItems).where(eq(orderItems.orderId, orderId)).all();
  return { order, items };
}
